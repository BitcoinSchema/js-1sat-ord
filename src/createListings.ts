import {
	P2PKH,
	SatoshisPerKilobyte,
	Script,
	Transaction,
	Utils,
} from "@bsv/sdk";
import { DEFAULT_SAT_PER_KB } from "./constants";
import {
	type CreateOrdTokenListingsConfig,
	type CreateOrdListingsConfig,
	type Utxo,
	type TransferTokenInscription,
	type TransferBSV20Inscription,
	type TransferBSV21Inscription,
	TokenType,
	type TokenUtxo,
} from "./types";
import { inputFromB64Utxo } from "./utils/utxo";
import OrdLock from "./templates/ordLock";
import OrdP2PKH from "./templates/ordP2pkh";
const { toArray } = Utils;

// TODO: Handle royalty
export const createOrdListings = async (config: CreateOrdListingsConfig) => {
	const {
		utxos,
		listings,
		paymentPk,
		ordPk,
		changeAddress,
		satsPerKb = DEFAULT_SAT_PER_KB,
		additionalPayments = [],
		royalty,
	} = config;

	const modelOrFee = new SatoshisPerKilobyte(satsPerKb);
	const tx = new Transaction();

	// Warn if creating many inscriptions at once
	if (listings.length > 100) {
		console.warn(
			"Creating many inscriptions at once can be slow. Consider using multiple transactions instead.",
		);
	}

	// Outputs
	// Add listing outputs
	for (const listing of listings) {
		tx.addOutput({
			satoshis: 1,
			lockingScript: new OrdLock().lock(
				listing.payAddress,
				listing.ordAddress,
				listing.price,
			),
		});
		const inputScriptBinary = toArray(listing.listingUtxo.script, "base64");
		const inputScript = Script.fromBinary(inputScriptBinary);
		tx.addInput({
			unlockingScriptTemplate: new OrdP2PKH().unlock(
				ordPk,
				"all",
				true,
				listing.listingUtxo.satoshis,
				inputScript,
			),
			sourceTXID: listing.listingUtxo.txid,
			sourceOutputIndex: listing.listingUtxo.vout,
			sequence: 0xffffffff,
		});
	}

	// Add additional payments if any
	for (const p of additionalPayments) {
		tx.addOutput({
			satoshis: p.amount,
			lockingScript: new P2PKH().lock(p.to),
		});
	}

	// Check if change is needed
	let payChange: Utxo | undefined;
	const changeScript = new P2PKH().lock(
		changeAddress || paymentPk.toAddress().toString(),
	);
	const changeOutput = {
		lockingScript: changeScript,
		change: true,
	};
	tx.addOutput(changeOutput);

	let totalSatsIn = 0n;
	const totalSatsOut = tx.outputs.reduce(
		(total, out) => total + BigInt(out.satoshis || 0),
		0n,
	);
	let fee = 0;
	for (const utxo of utxos) {
		const input = inputFromB64Utxo(utxo, new P2PKH().unlock(paymentPk));

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

	// Calculate fee
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

export const createOrdTokenListings = async (
	config: CreateOrdTokenListingsConfig,
) => {
	const {
		utxos,
		protocol,
		tokenID,
		ordPk,
		paymentPk,
		additionalPayments,
		changeAddress,
		tokenChangeAddress,
		inputTokens,
		listings,
		satsPerKb = DEFAULT_SAT_PER_KB,
	} = config;

	const modelOrFee = new SatoshisPerKilobyte(satsPerKb);
	const tx = new Transaction();

	// Warn if creating many inscriptions at once
	if (listings.length > 100) {
		console.warn(
			"Creating many inscriptions at once can be slow. Consider using multiple transactions instead.",
		);
	}

	// Ensure these inputs are for the expected token
	if (!inputTokens.every((token) => token.id === tokenID)) {
		throw new Error("Input tokens do not match the provided tokenID");
	}

	// calculate change amount
	let changeAmt = 0n;
	let totalAmtIn = 0n;
	let totalAmtOut = 0n;

	// Ensure these inputs are for the expected token
	if (!inputTokens.every((token) => token.id === tokenID)) {
		throw new Error("Input tokens do not match the provided tokenID");
	}

	// Outputs
	// Add listing outputs
	for (const listing of listings) {
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
			lockingScript: new OrdLock().lock(
				listing.payAddress,
				listing.ordAddress,
				listing.price,
				{
					dataB64: Buffer.from(JSON.stringify(inscription)).toString("base64"),
					contentType: "application/bsv20",
				},
			),
		});
		totalAmtOut += BigInt(listing.listingUtxo.amt);
	}

	for (const token of inputTokens) {
		const inputScriptBinary = toArray(token.script, "base64");
		const inputScript = Script.fromBinary(inputScriptBinary);
		tx.addInput({
			unlockingScriptTemplate: new OrdP2PKH().unlock(
				ordPk,
				"all",
				true,
				token.satoshis,
				inputScript,
			),
			sourceTXID: token.txid,
			sourceOutputIndex: token.vout,
			sequence: 0xffffffff,
		});

		totalAmtIn += BigInt(token.amt);
	}
	changeAmt = totalAmtIn - totalAmtOut;

	let tokenChange: TokenUtxo | undefined;
	// check that you have enough tokens to send and return change
	if (changeAmt < 0n) {
		throw new Error("Not enough tokens to send");
	}
	if (changeAmt > 0n) {
		const transferInscription: TransferTokenInscription = {
			p: "bsv-20",
			op: "transfer",
			amt: changeAmt.toString(),
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

		const lockingScript = new OrdP2PKH().lock(tokenChangeAddress, {
			dataB64: JSON.stringify(inscription),
			contentType: "application/bsv-20",
		});
		const vout = tx.outputs.length;
		tx.addOutput({ lockingScript, satoshis: 1 });
		tokenChange = {
			id: tokenID,
			satoshis: 1,
			script: Buffer.from(lockingScript.toBinary()).toString("base64"),
			txid: "",
			vout,
			amt: changeAmt.toString(),
		};
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
		const input = inputFromB64Utxo(utxo, new P2PKH().unlock(paymentPk));

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

	const txid = tx.id("hex") as string;
	if (tokenChange) {
		tokenChange.txid = txid;
	}
	// check for change
	const payChangeOutIdx = tx.outputs.findIndex((o) => o.change);
	if (payChangeOutIdx !== -1) {
		const changeOutput = tx.outputs[payChangeOutIdx];
		payChange = {
			satoshis: changeOutput.satoshis as number,
			txid,
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
		tokenChange,
	};
};
