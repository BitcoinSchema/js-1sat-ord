import {
	type PrivateKey,
	Transaction,
	SatoshisPerKilobyte,
	P2PKH,
	type Script,
	type TransactionOutput,
} from "@bsv/sdk";
import { DEFAULT_SAT_PER_KB } from "./constants";
import OrdP2PKH from "./templates/ordP2pkh";
import type {
	Utxo,
	Destination,
	MAP,
	Payment,
	LocalSigner,
	RemoteSigner,
} from "./types";
import { inputFromB64Utxo } from "./utils/utxo";
import { signData } from "./signData";

export type SendOrdinalsResult = {
	tx: Transaction;
	spentOutpoints: string[];
	payChangeVout?: number;
};

export type SendOrdinalsConfig = {
	paymentUtxos: Utxo[];
	ordinals: Utxo[];
	paymentPk: PrivateKey;
	ordPk: PrivateKey;
	destinations: Destination[];
	changeAddress?: string;
	satsPerKb?: number;
	metaData?: MAP;
	signer?: LocalSigner | RemoteSigner;
	additionalPayments?: Payment[];
	enforceUniformSend?: boolean;
}

/**
 * Sends ordinals to the given destinations
 * @param {SendOrdinalsConfig} config - Configuration object for sending ordinals
 * @param {Utxo[]} config.paymentUtxos - Utxos to spend (with base64 encoded scripts)
 * @param {Utxo[]} config.ordinals - Utxos to spend (with base64 encoded scripts)
 * @param {PrivateKey} config.paymentPk - Private key to sign paymentUtxos
 * @param {PrivateKey} config.ordPk - Private key to sign ordinals
 * @param {Destination[]} config.destinations - Array of destinations with addresses and inscriptions
 * @param {string} config.changeAddress - Optional. Address to send change to, if any. If not provided, defaults to paymentPk address
 * @param {number} config.satsPerKb - Optional. Satoshis per kilobyte for fee calculation. Default is DEFAULT_SAT_PER_KB
 * @param {MAP} config.metaData - Optional. MAP (Magic Attribute Protocol) metadata to include in inscriptions
 * @param {LocalSigner | RemoteSigner} config.signer - Optional. Signer object to sign the transaction
 * @param {Payment[]} config.additionalPayments - Optional. Additional payments to include in the transaction
 * @param {boolean} config.enforceUniformSend - Optional. Default: true. Enforce that the number of destinations matches the number of ordinals being sent. Sending ordinals requires a 1:1 mapping of destinations to ordinals. This is only used for sub-protocols like BSV21 that manage tokens without sending the inscriptions directly.
 * @returns {Promise<SendOrdinalsResult>} Transaction, spent outpoints, and change vout
 */
export const sendOrdinals = async (config: SendOrdinalsConfig): Promise<SendOrdinalsResult> => {
	if (!config.satsPerKb) {
		config.satsPerKb = DEFAULT_SAT_PER_KB;
	}
	if (!config.additionalPayments) {
		config.additionalPayments = [];
	}
	if (config.enforceUniformSend === undefined) {
		config.enforceUniformSend = true;
	}

	const modelOrFee = new SatoshisPerKilobyte(config.satsPerKb);
	let tx = new Transaction();
	const spentOutpoints: string[] = [];
	let payChangeVout: number | undefined;

	// Inputs
	// Add ordinal inputs
	for (const ordUtxo of config.ordinals) {
		if (ordUtxo.satoshis !== 1) {
			throw new Error("1Sat Ordinal utxos must have exactly 1 satoshi");
		}

		const input = inputFromB64Utxo(ordUtxo, new OrdP2PKH().unlock(config.ordPk));
		spentOutpoints.push(`${ordUtxo.txid}_${ordUtxo.vout}`);
		tx.addInput(input);
	}

	// Outputs
	// check that ordinals coming in matches ordinals going out if supplied
	if (config.enforceUniformSend && config.destinations.length !== config.ordinals.length) {
		throw new Error(
			"Number of destinations must match number of ordinals being sent",
		);
	}

	// Add ordinal outputs
	for (const destination of config.destinations) {
		let s: Script;
		if (
			destination.inscription?.dataB64 &&
			destination.inscription?.contentType
		) {
			s = new OrdP2PKH().lock(
				destination.address,
				destination.inscription.dataB64,
				destination.inscription.contentType,
				config.metaData,
			);
		} else {
			s = new P2PKH().lock(destination.address);
		}

		tx.addOutput({
			satoshis: 1,
			lockingScript: s,
		});
	}

	// Add additional payments if any
	for (const p of config.additionalPayments) {
		console.log("Additional payment", p);
		tx.addOutput({
			satoshis: p.amount,
			lockingScript: new P2PKH().lock(p.to),
		});
	}

	// Add payment inputs
	for (const paymentUtxo of config.paymentUtxos) {
		const input = inputFromB64Utxo(paymentUtxo, new P2PKH().unlock(config.paymentPk));
		spentOutpoints.push(`${paymentUtxo.txid}_${paymentUtxo.vout}`);
		tx.addInput(input);
	}

	// Add change output if needed
	const fee = await modelOrFee.computeFee(tx);
	const totalSatsIn = config.paymentUtxos.reduce(
		(total, utxo) => total + BigInt(utxo.satoshis),
		0n,
	);
	const totalSatsOut = tx.outputs.reduce(
		(total, out) => total + (out.satoshis || 0),
		0,
	);

	if (totalSatsIn < totalSatsOut) {
		throw new Error("Not enough ordinals to send");
	}
	
	if (totalSatsIn > totalSatsOut + fee) {
		const changeScript = new P2PKH().lock(
			config.changeAddress || config.paymentPk.toAddress().toString(),
		);
		const changeOut: TransactionOutput = {
			lockingScript: changeScript,
			change: true,
		};
		payChangeVout = tx.outputs.length;
		tx.addOutput(changeOut);
	}

	if (config.signer) {
		tx = await signData(tx, config.signer);
	}

	// Calculate fee
	await tx.fee(modelOrFee);

	// Sign the transaction
	await tx.sign();

	return {
		tx,
		spentOutpoints,
		payChangeVout,
	};
};