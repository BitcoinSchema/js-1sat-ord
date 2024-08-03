import { P2PKH, SatoshisPerKilobyte, Script, Transaction, Utils } from "@bsv/sdk";
import { DEFAULT_SAT_PER_KB } from "./constants";
import {
	TokenType,
	type Inscription,
	type PurchaseOrdListingConfig,
	type PurchaseOrdTokenListingConfig,
	type TransferBSV20Inscription,
	type TransferBSV21Inscription,
	type TransferTokenInscription,
	type Utxo,
} from "./types";
import { inputFromB64Utxo } from "./utils/utxo";
import OrdLock from "./templates/ordLock";
import OrdP2PKH from "./templates/ordP2pkh";

export const purchaseOrdListings = async (config: PurchaseOrdListingConfig) => {
	const {
		protocol,
		tokenID,
		utxos,
		paymentPk,
		listing,
		ordAddress,
		changeAddress,
		additionalPayments = [],
		satsPerKb = DEFAULT_SAT_PER_KB,
	} = config;

	const modelOrFee = new SatoshisPerKilobyte(satsPerKb);
	const tx = new Transaction();

	// Inputs
	// Add the locked ordinal we're purchasing
	tx.addInput(inputFromB64Utxo(
		listing.listingUtxo,
		new OrdLock().purchaseListing(
			listing.listingUtxo.satoshis,
			Script.fromHex(Buffer.from(listing.listingUtxo.script, "base64").toString("hex")),
		),
	));

	// Outputs
	// Add the purchased output
	const transferInscription: TransferTokenInscription = {
		p: "bsv-20",
		op: "transfer",
		amt: listing.listingUtxo.amt,
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
	tx.addOutput({
		satoshis: 1,
		lockingScript: new OrdP2PKH().lock(ordAddress, {
			dataB64: Buffer.from(JSON.stringify(inscription)).toString('base64'),
			contentType: "application/bsv-20"
		}),
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

	const change = changeAddress || paymentPk.toAddress().toString();
	const changeScript = new P2PKH().lock(change);
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
		const input = inputFromB64Utxo(utxo, new P2PKH().unlock(
			paymentPk, 
			"all",
			true, 
			utxo.satoshis,
			Script.fromBinary(Utils.toArray(utxo.script, 'base64'))
		));

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
			`Not enough funds to purchase listing. Total sats in: ${totalSatsIn}, Total sats out: ${totalSatsOut}, Fee: ${fee}`,
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

export const purchaseOrdTokenListing = async (
	config: PurchaseOrdTokenListingConfig,
) => {
	const {
		protocol,
		tokenID,
		utxos,
		paymentPk,
		listingUtxo,
		ordAddress,
		changeAddress,
		satsPerKb = DEFAULT_SAT_PER_KB,
		additionalPayments = [],
	} = config;

	const modelOrFee = new SatoshisPerKilobyte(satsPerKb);
	const tx = new Transaction();

	// Inputs
	// Add the locked ordinal we're purchasing
	tx.addInput(inputFromB64Utxo(
		listingUtxo,
		new OrdLock().purchaseListing(
			1,
			Script.fromHex(Buffer.from(listingUtxo.script, "base64").toString("hex")),
		),
	));

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
		lockingScript: new OrdP2PKH().lock(ordAddress, {
			dataB64,
			contentType: "bsv-20",
		}),
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

	const change = changeAddress || paymentPk.toAddress().toString();
	const changeScript = new P2PKH().lock(change);
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
		const input = inputFromB64Utxo(utxo, new P2PKH().unlock(
			paymentPk, 
			"all",
			true, 
			utxo.satoshis,
			Script.fromBinary(Utils.toArray(utxo.script, 'base64'))
		));

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
		spentOutpoints: utxos.map((utxo) => `${utxo.txid}_${utxo.vout}`),
		payChange,
	};
};
