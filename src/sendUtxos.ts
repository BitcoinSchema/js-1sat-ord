import {
	type PrivateKey,
	Transaction,
	SatoshisPerKilobyte,
	P2PKH,
	type TransactionOutput,
	Utils,
	Script,
} from "@bsv/sdk";
import { DEFAULT_SAT_PER_KB } from "./constants";
import type { ChangeResult, SendUtxosConfig, Utxo } from "./types";
import { inputFromB64Utxo } from "./utils/utxo";
import OrdP2PKH from "./templates/ordP2pkh";

/**
 * Sends utxos to the given destination
 * @param {SendUtxosConfig} config - Configuration object for sending utxos
 * @param {Utxo[]} config.utxos - Utxos to spend (with base64 encoded scripts)
 * @param {PrivateKey} config.paymentPk - Private key to sign utxos
 * @param {Payment[]} config.payments - Array of payments with addresses and amounts
 * @param {number} [config.satsPerKb] - (Optional) Satoshis per kilobyte for fee calculation. Default is DEFAULT_SAT_PER_KB
 * @param {string} [config.changeAddress] - (Optional) Address to send change to. If not provided, defaults to paymentPk address
 * @param {string} [config.metaData] - (Optional) Metadata to include in OP_RETURN of the payment output
 * @returns {Promise<ChangeResult>} - Returns a ChangeResult: payChange, tx, and spentOutputs
 */
export const sendUtxos = async (
	config: SendUtxosConfig,
): Promise<ChangeResult> => {
	const {
		utxos,
		paymentPk,
		payments,
		satsPerKb = DEFAULT_SAT_PER_KB,
		changeAddress,
		metaData,
	} = config;

	const modelOrFee = new SatoshisPerKilobyte(satsPerKb);

	const tx = new Transaction();

	// Outputs
	for (const payment of payments) {
		const sendTxOut: TransactionOutput = {
			satoshis: payment.amount,
			lockingScript: new OrdP2PKH().lock(payment.to, undefined, metaData),
		};
		tx.addOutput(sendTxOut);
	}

	// Inputs
	let totalSatsIn = 0n;
	const totalSatsOut = tx.outputs.reduce(
		(total, out) => total + (out.satoshis || 0),
		0,
	);
	let fee = 0;
	for (const utxo of utxos) {
		if (!paymentPk && !utxo.pk) {
			throw new Error("Private key is required to sign the utxos");
		}
		const input = inputFromB64Utxo(utxo, new P2PKH().unlock(
			utxo.pk || paymentPk!,
			"all",
			true,
			utxo.satoshis,
			Script.fromBinary(Utils.toArray(utxo.script, 'base64'))
		));
		tx.addInput(input);

		// stop adding inputs if the total amount is enough
		totalSatsIn += BigInt(utxo.satoshis);
		fee = await modelOrFee.computeFee(tx);

		if (totalSatsIn >= totalSatsOut + fee) {
			break;
		}
	}

	// make sure we have enough
	if (totalSatsIn < totalSatsOut + fee) {
		throw new Error(
			`Not enough funds to send. Total sats in: ${totalSatsIn}, Total sats out: ${totalSatsOut}, Fee: ${fee}`,
		);
	}

	// if we need to send change, add it to the outputs
	let payChange: Utxo | undefined;
	if (totalSatsIn > totalSatsOut + fee) {
		if(!changeAddress && !paymentPk) {
			throw new Error("Either changeAddress or paymentPk is required");
		}
		// Change
		const changeScript = new P2PKH().lock(changeAddress || paymentPk!.toAddress().toString());

		const changeOut: TransactionOutput = {
			lockingScript: changeScript,
			change: true,
		};
		payChange = {
			txid: "", // txid is not known yet
			vout: tx.outputs.length,
			satoshis: 0, // change output amount is not known yet
			script: Buffer.from(changeScript.toHex(), "hex").toString("base64"),
		};
		tx.addOutput(changeOut);
	} else if (totalSatsIn < totalSatsOut + fee) {
		console.log("No change needed");
	}

	// Calculate fee
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
