import {
	TokenType,
	type TransferBSV20Inscription,
	type TransferTokenInscription,
	type TransferBSV21Inscription,
	type TransferOrdTokensConfig,
	type TransferOrdTokensResult,
	type TokenUtxo,
	type Utxo,
} from "./types";
import { DEFAULT_SAT_PER_KB } from "./constants";
import { P2PKH, SatoshisPerKilobyte, Script, Transaction, Utils } from "@bsv/sdk";
import OrdP2PKH from "./templates/ordP2pkh";
import { inputFromB64Utxo } from "./utils/utxo";

/**
 * Transfer tokens to a destination
 * @param {TransferOrdTokensConfig} config - Configuration object for transferring tokens
 * @param {TokenType} config.protocol - Token protocol. Must be TokenType.BSV20 or TokenType.BSV21
 * @param {string} config.tokenID - Token ID. Either the tick or id value depending on the protocol
 * @param {Utxo[]} config.utxos - Payment Utxos available to spend. Will only consume what is needed.
 * @param {TokenUtxo[]} config.inputTokens - Token utxos to spend
 * @param {Distribution[]} config.distributions - Array of destinations with addresses and amounts
 * @param {PrivateKey} config.paymentPk - Private key to sign paymentUtxos
 * @param {PrivateKey} config.ordPk - Private key to sign ordinals
 * @param {string} config.changeAddress - Optional. Address to send payment change to, if any. If not provided, defaults to paymentPk address
 * @param {string} config.tokenChangeAddress - Optional. Address to send token change to, if any. If not provided, defaults to ordPk address
 * @param {number} config.satsPerKb - Optional. Satoshis per kilobyte for fee calculation. Default is DEFAULT_SAT_PER_KB
 * @param {PreMAP} config.metaData - Optional. MAP (Magic Attribute Protocol) metadata to include in inscriptions
 * @param {LocalSigner | RemoteSigner} config.signer - Optional. Signer object to sign the transaction
 * @param {Payment[]} config.additionalPayments - Optional. Additional payments to include in the transaction
 * @param {burn} config.burn - Optional. Set to true to burn the tokens.
 * @returns {Promise<TransferOrdTokensResult>} Transaction with token transfer outputs
 */
export const transferOrdTokens = async (config: TransferOrdTokensConfig): Promise<TransferOrdTokensResult> => {
	const {
		protocol,
		tokenID,
		utxos,
		inputTokens,
		distributions,
		paymentPk,
		ordPk,
		changeAddress,
		tokenChangeAddress,
		satsPerKb = DEFAULT_SAT_PER_KB,
		metaData,
		signer,
		additionalPayments = [],
		burn = false
	} = config;

	// calculate change amount
	let changeAmt = 0n;
	let totalAmtIn = 0n;
	let totalAmtOut = 0n;

	// Ensure these inputs are for the expected token
	if (!inputTokens.every((token) => token.id === tokenID)) {
		throw new Error("Input tokens do not match the provided tokenID");
	}

	const modelOrFee = new SatoshisPerKilobyte(satsPerKb);
	const tx = new Transaction();

	for (const token of inputTokens) {
		const inputScriptBinary = Utils.toArray(token.script, "base64");
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

	// build destination inscriptions
	for (const dest of distributions) {
		const transferInscription: TransferTokenInscription = {
			p: "bsv-20",
			op: burn ? "burn" : "transfer",
			amt: dest.amt,
		}
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
			lockingScript: new OrdP2PKH().lock(
				dest.address,
				{
					dataB64: Buffer.from(JSON.stringify(inscription)).toString("base64"),
					contentType: "application/bsv20",
				},
			),
		});
		totalAmtOut += BigInt(dest.amt);
	};
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

		const lockingScript = new OrdP2PKH().lock(
			tokenChangeAddress || ordPk.toAddress().toString(), 
			{
				dataB64: JSON.stringify(inscription),
				contentType: "application/bsv-20",
			}
		);
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