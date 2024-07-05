import {
	type PrivateKey,
	Transaction,
	SatoshisPerKilobyte,
	P2PKH,
	type Script,
	type TransactionOutput,
} from "@bsv/sdk";
import { DEFAULT_SAT_PER_KB } from "./constants";
import OrdP2PKH from "./ordP2pkh";
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

/**
 * Sends ordinals to the given destinations
 * @param {Utxo[]} paymentUtxos - Utxos to spend (with base64 encoded scripts)
 * @param {Utxo[]} ordinals - Utxos to spend (with base64 encoded scripts)
 * @param {PrivateKey} paymentPk - Private key to sign paymentUtxos
 * @param {PrivateKey} ordPk - Private key to sign ordinals
 * @param {Destination[]} destinations - Array of destinations with addresses and inscriptions
 * @param {string} changeAddress - (optional) Address to send change to, if any. If not provided, defaults to paymentPk address
 * @param {number} satsPerKb - (optional) Satoshis per kilobyte for fee calculation. Default is DEFAULT_SAT_PER_KB
 * @param {MAP} metaData - (optional) MAP (Magic Attribute Protocol) metadata to include in inscriptions
 * @param {Payment[]} additionalPayments -(optional)  Additional payments to include in the transaction
 * @param {boolean} enforceUniformSend - (optional) Enforce that the number of destinations matches the number of ordinals being sent. Sending ordinals requires a 1:1 mapping of destinations to ordinals. Default is true. This is only used for sub-protocols like BSV21 that manage tokens without sending the inscriptions directly.
 * @returns {Promise<Transaction>} Transaction with inscription outputs
 */
export const sendOrdinals = async (
	paymentUtxos: Utxo[],
	ordinals: Utxo[],
	paymentPk: PrivateKey,
	ordPk: PrivateKey,
	destinations: Destination[],
	changeAddress?: string,
	satsPerKb: number = DEFAULT_SAT_PER_KB,
	metaData?: MAP,
	signer?: LocalSigner | RemoteSigner,
	additionalPayments: Payment[] = [],
	enforceUniformSend = true,
): Promise<Transaction> => {
	const modelOrFee = new SatoshisPerKilobyte(satsPerKb);
	let tx = new Transaction();

	// Inputs
	// Add ordinal inputs
	for (const ordUtxo of ordinals) {
		if (ordUtxo.satoshis !== 1) {
			throw new Error("1Sat Ordinal utxos must have exactly 1 satoshi");
		}

		const input = inputFromB64Utxo(ordUtxo, new OrdP2PKH().unlock(ordPk));
		tx.addInput(input);
	}

	// Outputs
	// check that ordinals coming in matches ordinals going out if supplied
	if (enforceUniformSend && destinations.length !== ordinals.length) {
		throw new Error(
			"Number of destinations must match number of ordinals being sent",
		);
	}

	// Add ordinal outputs
	for (const destination of destinations) {
		let s: Script;
		if (
			destination.inscription?.dataB64 &&
			destination.inscription?.contentType
		) {
			s = new OrdP2PKH().lock(
				destination.address,
				destination.inscription.dataB64,
				destination.inscription.contentType,
				metaData,
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
	for (const p of additionalPayments) {
		console.log("Additional payment", p);
		tx.addOutput({
			satoshis: p.amount,
			lockingScript: new P2PKH().lock(p.to),
		});
	}

	// Add payment inputs
	for (const paymentUtxo of paymentUtxos) {
		const input = inputFromB64Utxo(paymentUtxo, new P2PKH().unlock(paymentPk));
		tx.addInput(input);
	}

	// Add change output
	const changeScript = new P2PKH().lock(
		changeAddress || paymentPk.toAddress().toString(),
	);
	const changeOut: TransactionOutput = {
		lockingScript: changeScript,
		change: true,
	};

	tx.addOutput(changeOut);
	if (signer) {
		tx = await signData(tx, signer);
	}

	// Calculate fee
	await tx.fee(modelOrFee);

	// Sign the transaction
	await tx.sign();

	return tx;
};
