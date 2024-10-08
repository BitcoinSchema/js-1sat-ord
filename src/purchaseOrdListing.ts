import {
	LockingScript,
	P2PKH,
	SatoshisPerKilobyte,
	Script,
	Transaction,
	Utils,
} from "@bsv/sdk";
import { DEFAULT_SAT_PER_KB } from "./constants";
import OrdLock from "./templates/ordLock";
import OrdP2PKH from "./templates/ordP2pkh";
import {
	type ChangeResult,
	RoytaltyType,
	TokenType,
	type PurchaseOrdListingConfig,
	type PurchaseOrdTokenListingConfig,
	type TransferBSV20Inscription,
	type TransferBSV21Inscription,
	type TransferTokenInscription,
	type Utxo,
	MAP,
} from "./types";
import { resolvePaymail } from "./utils/paymail";
import { inputFromB64Utxo } from "./utils/utxo";

/**
 * Purchase a listing
 * @param {PurchaseOrdListingConfig} config - Configuration object for purchasing a listing
 * @param {Utxo[]} config.utxos - Utxos to spend (with base64 encoded scripts)
 * @param {PrivateKey} config.paymentPk - Private key to sign payment inputs
 * @param {ExistingListing} config.listing - Listing to purchase
 * @param {string} config.ordAddress - Address to send the ordinal to
 * @param {string} [config.changeAddress] - Optional. Address to send change to
 * @param {number} [config.satsPerKb] - Optional. Satoshis per kilobyte for fee calculation
 * @param {Payment[]} [config.additionalPayments] - Optional. Additional payments to make
 * @param {Royalty[]} [config.royalties] - Optional. Royalties to pay
 * @param {MAP} [config.metaData] - Optional. MAP (Magic Attribute Protocol) metadata to include on purchased output
 * @returns {Promise<ChangeResult>} Transaction, spent outpoints, change utxo
 */
export const purchaseOrdListing = async (
	config: PurchaseOrdListingConfig,
): Promise<ChangeResult> => {
	const {
		utxos,
		paymentPk,
		listing,
		ordAddress,
		additionalPayments = [],
		satsPerKb = DEFAULT_SAT_PER_KB,
		royalties = [],
		metaData,
	} = config;

	const modelOrFee = new SatoshisPerKilobyte(satsPerKb);
	const tx = new Transaction();

	// Inputs
	// Add the locked ordinal we're purchasing
	tx.addInput(
		inputFromB64Utxo(
			listing.listingUtxo,
			new OrdLock().purchaseListing(
				1,
				Script.fromBinary(Utils.toArray(listing.listingUtxo.script, "base64")),
			),
		),
	);

	// Outputs
	// Add the purchased output
	tx.addOutput({
		satoshis: 1,
		lockingScript: new OrdP2PKH().lock(ordAddress, undefined, metaData),
	});

	// add the payment output
	const reader = new Utils.Reader(Utils.toArray(listing.payout, "base64"));
	const satoshis = reader.readUInt64LEBn().toNumber();
	const scriptLength = reader.readVarIntNum();
	const scriptBin = reader.read(scriptLength);
	const lockingScript = LockingScript.fromBinary(scriptBin);
	tx.addOutput({
		satoshis,
		lockingScript,
	});

	// Add additional payments if any
	for (const p of additionalPayments) {
		tx.addOutput({
			satoshis: p.amount,
			lockingScript: new P2PKH().lock(p.to),
		});
	}

	// Add any royalties
	for (const r of royalties) {
		let lockingScript: LockingScript | undefined;
		const royaltySats = Math.floor(Number(r.percentage) * satoshis);

		switch (r.type as RoytaltyType) {
			case RoytaltyType.Paymail:
				// resolve paymail address
				lockingScript = await resolvePaymail(r.destination, royaltySats);
				break;
			case RoytaltyType.Script:
				lockingScript = Script.fromBinary(
					Utils.toArray(r.destination, "base64"),
				);
				break;
			case RoytaltyType.Address:
				lockingScript = new P2PKH().lock(r.destination);
				break;
			default:
				throw new Error("Invalid royalty type");
		}
		if (!lockingScript) {
			throw new Error("Invalid royalty destination");
		}
		tx.addOutput({
			satoshis: royaltySats,
			lockingScript,
		});
	}

	// add change to the outputs
	let payChange: Utxo | undefined;
  const changeAddress = config.changeAddress || paymentPk?.toAddress();
	if (!changeAddress) {
		throw new Error("Either changeAddress or paymentPk is required");
	}
	const changeScript = new P2PKH().lock(changeAddress);
	const changeOut = {
		lockingScript: changeScript,
		change: true,
	};
	tx.addOutput(changeOut);

	let totalSatsIn = 0n;
	const totalSatsOut = tx.outputs.reduce(
		(total, out) => total + BigInt(out.satoshis || 0),
		0n,
	);
	let fee = 0;
	for (const utxo of utxos) {
    const payKeyToUse = utxo.pk || paymentPk;
		if(!payKeyToUse) {
			throw new Error("Private key is required to sign the payment");
		}
		const input = inputFromB64Utxo(
			utxo,
			new P2PKH().unlock(
				payKeyToUse,
				"all",
				true,
				utxo.satoshis,
				Script.fromBinary(Utils.toArray(utxo.script, "base64")),
			),
		);

		tx.addInput(input);
		// stop adding inputs if the total amount is enough
		totalSatsIn += BigInt(utxo.satoshis);
		fee = await modelOrFee.computeFee(tx);

		if (totalSatsIn >= totalSatsOut + BigInt(fee)) {
			break;
		}
	}

	// make sure we have enough
	if (totalSatsIn < totalSatsOut + BigInt(fee)) {
		throw new Error(
			`Not enough funds to purchase ordinal listing. Total sats in: ${totalSatsIn}, Total sats out: ${totalSatsOut}, Fee: ${fee}`,
		);
	}

	// estimate the cost of the transaction and assign change value
	await tx.fee(modelOrFee);

	// Sign the transaction
	await tx.sign();

	// check for change
	const payChangeOutIdx = tx.outputs.findIndex((o) => o.change);
	if (payChangeOutIdx !== -1) {
		const changeOutput = tx.outputs[payChangeOutIdx];
		payChange = {
			satoshis: changeOutput.satoshis as number,
			txid: tx.id("hex") as string,
			vout: payChangeOutIdx,
			script: Buffer.from(changeOutput.lockingScript.toBinary()).toString(
				"base64",
			),
		};
	}

	if (payChange) {
		const changeOutput = tx.outputs[tx.outputs.length - 1];
		payChange.satoshis = changeOutput.satoshis as number;
		payChange.txid = tx.id("hex") as string;
	}

	return {
		tx,
		spentOutpoints: tx.inputs.map(
			(i) => `${i.sourceTXID}_${i.sourceOutputIndex}`,
		),
		payChange,
	};
};

/**
 *
 * @param {PurchaseOrdTokenListingConfig} config  - Configuration object for purchasing a token listing
 * @param {TokenType} config.protocol - Token protocol
 * @param {string} config.tokenID - Token ID
 * @param {Utxo[]} config.utxos - Utxos to spend (with base64 encoded scripts)
 * @param {PrivateKey} config.paymentPk - Private key to sign payment inputs
 * @param {Utxo} config.listingUtxo - Listing UTXO
 * @param {string} config.ordAddress - Address to send the ordinal to
 * @param {string} [config.changeAddress] - Optional. Address to send change to
 * @param {number} [config.satsPerKb] - Optional. Satoshis per kilobyte for fee calculation
 * @param {Payment[]} [config.additionalPayments] - Optional. Additional payments to make
 * @param {MAP} [config.metaData] - Optional. MAP (Magic Attribute Protocol) metadata to include on the purchased transfer inscription output
 * @returns {Promise<ChangeResult>} Transaction, spent outpoints, change utxo
 */
export const purchaseOrdTokenListing = async (
	config: PurchaseOrdTokenListingConfig,
): Promise<ChangeResult> => {
	const {
		protocol,
		tokenID,
		utxos,
		paymentPk,
		listingUtxo,
		ordAddress,
		satsPerKb = DEFAULT_SAT_PER_KB,
		additionalPayments = [],
		metaData,
	} = config;

	const modelOrFee = new SatoshisPerKilobyte(satsPerKb);
	const tx = new Transaction();

	// Inputs
	// Add the locked ordinal we're purchasing
	tx.addInput(
		inputFromB64Utxo(
			listingUtxo,
			new OrdLock().purchaseListing(
				1,
				Script.fromBinary(Utils.toArray(listingUtxo.script, "base64")),
			),
		),
	);

	// Outputs
	const transferInscription: TransferTokenInscription = {
		p: "bsv-20",
		op: "transfer",
		amt: listingUtxo.amt,
	};
	let inscription: TransferBSV20Inscription | TransferBSV21Inscription;
	if (protocol === TokenType.BSV20) {
		inscription = {
			...transferInscription,
			tick: tokenID,
		} as TransferBSV20Inscription;
	} else if (protocol === TokenType.BSV21) {
		inscription = {
			...transferInscription,
			id: tokenID,
		} as TransferBSV21Inscription;
	} else {
		throw new Error("Invalid protocol");
	}
	const dataB64 = Buffer.from(JSON.stringify(inscription)).toString("base64");

	// Add the purchased output
	tx.addOutput({
		satoshis: 1,
		lockingScript: new OrdP2PKH().lock(
			ordAddress,
			{
				dataB64,
				contentType: "application/bsv-20",
			},
			metaData,
		),
	});

	if (!listingUtxo.payout) {
		throw new Error("Listing UTXO does not have a payout script");
	}

	// Add the payment output
	const reader = new Utils.Reader(Utils.toArray(listingUtxo.payout, "base64"));
	const satoshis = reader.readUInt64LEBn().toNumber();
	const scriptLength = reader.readVarIntNum();
	const scriptBin = reader.read(scriptLength);
	const lockingScript = LockingScript.fromBinary(scriptBin);
	tx.addOutput({
		satoshis,
		lockingScript,
	});

	// Add additional payments if any
	for (const p of additionalPayments) {
		tx.addOutput({
			satoshis: p.amount,
			lockingScript: new P2PKH().lock(p.to),
		});
	}

	// add change to the outputs
	let payChange: Utxo | undefined;
  const changeAddress = config.changeAddress || paymentPk?.toAddress();
	if (!changeAddress) {
		throw new Error("Either changeAddress or paymentPk is required");
	}
	const changeScript = new P2PKH().lock(changeAddress);
	const changeOut = {
		lockingScript: changeScript,
		change: true,
	};
	tx.addOutput(changeOut);

	let totalSatsIn = 0n;
	const totalSatsOut = tx.outputs.reduce(
		(total, out) => total + BigInt(out.satoshis || 0),
		0n,
	);
	let fee = 0;
	for (const utxo of utxos) {
    const payKeyToUse = utxo.pk || paymentPk;
		if (!payKeyToUse) {
			throw new Error("Private key is required to sign the payment");
		}
		const input = inputFromB64Utxo(
			utxo,
			new P2PKH().unlock(
				payKeyToUse,
				"all",
				true,
				utxo.satoshis,
				Script.fromBinary(Utils.toArray(utxo.script, "base64")),
			),
		);

		tx.addInput(input);
		// stop adding inputs if the total amount is enough
		totalSatsIn += BigInt(utxo.satoshis);
		fee = await modelOrFee.computeFee(tx);

		if (totalSatsIn >= totalSatsOut + BigInt(fee)) {
			break;
		}
	}

	// make sure we have enough
	if (totalSatsIn < totalSatsOut + BigInt(fee)) {
		throw new Error(
			`Not enough funds to purchase token listing. Total sats in: ${totalSatsIn}, Total sats out: ${totalSatsOut}, Fee: ${fee}`,
		);
	}

	// estimate the cost of the transaction and assign change value
	await tx.fee(modelOrFee);

	// Sign the transaction
	await tx.sign();

	const payChangeOutIdx = tx.outputs.findIndex((o) => o.change);
	if (payChangeOutIdx !== -1) {
		const changeOutput = tx.outputs[payChangeOutIdx];
		payChange = {
			satoshis: changeOutput.satoshis as number,
			txid: tx.id("hex") as string,
			vout: payChangeOutIdx,
			script: Buffer.from(changeOutput.lockingScript.toBinary()).toString(
				"base64",
			),
		};
	}

	if (payChange) {
		const changeOutput = tx.outputs[tx.outputs.length - 1];
		payChange.satoshis = changeOutput.satoshis as number;
		payChange.txid = tx.id("hex") as string;
	}

	return {
		tx,
		spentOutpoints: tx.inputs.map(
			(i) => `${i.sourceTXID}_${i.sourceOutputIndex}`,
		),
		payChange,
	};
};
