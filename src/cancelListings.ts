import { P2PKH, SatoshisPerKilobyte, Script, Transaction, Utils } from "@bsv/sdk";
import {
	TokenType,
	type CancelOrdListingsConfig,
	type CancelOrdTokenListingsConfig,
	type Destination,
	type TransferBSV20Inscription,
	type TransferBSV21Inscription,
	type TransferTokenInscription,
	type Utxo,
} from "./types";
import { inputFromB64Utxo } from "./utils/utxo";
import { DEFAULT_SAT_PER_KB } from "./constants";
import OrdLock from "./templates/ordLock";
import OrdP2PKH from "./templates/ordP2pkh";

export const cancelOrdListings = async (config: CancelOrdListingsConfig) => {
	const {
		utxos,
		listingUtxos,
		ordPk,
		paymentPk,
		changeAddress,
		additionalPayments = [],
		satsPerKb = DEFAULT_SAT_PER_KB,
	} = config;

	// Warn if creating many inscriptions at once
	if (listingUtxos.length > 100) {
		console.warn(
			"Creating many inscriptions at once can be slow. Consider using multiple transactions instead.",
		);
	}
	
	const modelOrFee = new SatoshisPerKilobyte(satsPerKb);
	const tx = new Transaction();

	// Inputs
	// Add the locked ordinals we're cancelling
	for (const listingUtxo of listingUtxos) {
		tx.addInput(inputFromB64Utxo(
			listingUtxo,
			new OrdLock().cancelListing(
				ordPk,
				"all",
				true,
				listingUtxo.satoshis,
				Script.fromBinary(Utils.toArray(listingUtxo.script, 'base64'))
			)
		));
		// Add cancel outputs returning listed ordinals
		tx.addOutput({
			satoshis: 1,
			lockingScript: new P2PKH().lock(ordPk.toAddress().toString()),
		});
	}

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
		const input = inputFromB64Utxo(
			utxo, 
			new P2PKH().unlock(
				paymentPk, 
				"all",
				true, 
				utxo.satoshis,
				Script.fromBinary(Utils.toArray(utxo.script, 'base64'))
			)
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

export const cancelOrdTokenListings = async (
	config: CancelOrdTokenListingsConfig,
) => {
	const {
		protocol,
		tokenID,
		ordAddress,
		changeAddress,
		paymentPk,
		ordPk,
		additionalPayments,
		listingUtxos,
		utxos,
		satsPerKb = DEFAULT_SAT_PER_KB,
	} = config;
	// calculate change amount
	let totalAmtIn = 0;

	if (listingUtxos.length > 100) {
		console.warn(
			"Creating many inscriptions at once can be slow. Consider using multiple transactions instead.",
		);
	}

	// Ensure these inputs are for the expected token
	if (!listingUtxos.every((token) => token.id === tokenID)) {
		throw new Error("Input tokens do not match the provided tokenID");
	}

	const modelOrFee = new SatoshisPerKilobyte(satsPerKb);
	const tx = new Transaction();

	// Inputs
	// Add the locked ordinals we're cancelling
	for (const listingUtxo of listingUtxos) {
		tx.addInput(inputFromB64Utxo(
			listingUtxo,
			new OrdLock().cancelListing(
				ordPk,
				"all",
				true,
				listingUtxo.satoshis,
				Script.fromBinary(Utils.toArray(listingUtxo.script, 'base64'))
			)
		));
		totalAmtIn += Number.parseInt(listingUtxo.amt);
	}

	const transferInscription: TransferTokenInscription = {
		p: "bsv-20",
		op: "transfer",
		amt: totalAmtIn.toString(),
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

	const destination: Destination = {
		address: ordAddress || ordPk.toAddress().toString(),
		inscription: {
			dataB64: Buffer.from(JSON.stringify(inscription)).toString("base64"),
			contentType: "application/bsv-20",
		},
	};

	tx.addOutput({
		satoshis: 1,
		lockingScript: new OrdP2PKH().lock(
			destination.address,
			destination.inscription
		),
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