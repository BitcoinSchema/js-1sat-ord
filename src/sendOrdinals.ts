import { type PrivateKey, Transaction, SatoshisPerKilobyte, P2PKH, type Script, type TransactionOutput } from "@bsv/sdk";
import { DEFAULT_SAT_PER_KB } from "./constants";
import OrdP2PKH from "./ordP2pkh";
import type { Utxo, Destination, MAP, Payment } from "./types";
import { fromB64Utxo } from "./utils/utxo";

/**
 * Sends ordinals to the given destinations
 * @param {Utxo[]} paymentUtxos - Utxos to spend (with base64 encoded scripts)
 * @param {Utxo[]} ordinals - Utxos to spend (with base64 encoded scripts)
 * @param {PrivateKey} paymentPk - Private key to sign paymentUtxos
 * @param {string} changeAddress - Address to send change to
 * @param {PrivateKey} ordPk - Private key to sign ordinals
 * @param {Destination[]} destinations - Array of destinations with addresses and inscriptions
 * @param {number} satsPerKb - Satoshis per kilobyte for fee calculation. Default is DEFAULT_SAT_PER_KB
 * @param {MAP} metaData - MAP (Magic Attribute Protocol) metadata to include in inscriptions
 * @param {Payment[]} additionalPayments - Additional payments to include in the transaction
 * @returns {Promise<Transaction>} Transaction with inscription outputs
 */
export const sendOrdinals = async (
	paymentUtxos: Utxo[],
	ordinals: Utxo[],
	paymentPk: PrivateKey,
	changeAddress: string,
	ordPk: PrivateKey,
	destinations: Destination[],
	satsPerKb: number = DEFAULT_SAT_PER_KB,
	metaData?: MAP,
	additionalPayments: Payment[] = [],
): Promise<Transaction> => {
	const modelOrFee = new SatoshisPerKilobyte(satsPerKb);
	const tx = new Transaction();

	// Inputs
	// Add ordinal inputs
	for (const ordUtxo of ordinals) {
		if (ordUtxo.satoshis !== 1) {
			throw new Error("1Sat Ordinal utxos must have exactly 1 satoshi");
		}
		
		const input = fromB64Utxo(ordUtxo, new OrdP2PKH().unlock(ordPk));
		tx.addInput(input);
	}

	// Add payment inputs
	for (const paymentUtxo of paymentUtxos) {
		const input = fromB64Utxo(paymentUtxo, new P2PKH().unlock(paymentPk));
		tx.addInput(input);
	}

	// Outputs
	// check that ordinals coming in matches ordinals going out if supplied
	if (destinations.length !== ordinals.length) {
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
		tx.addOutput({
			satoshis: p.amount,
			lockingScript: new P2PKH().lock(p.to),
		});
	}

	// Add change output
	const changeScript = new P2PKH().lock(changeAddress);
	const changeOut: TransactionOutput = {
		lockingScript: changeScript,
		change: true,
	};
	tx.addOutput(changeOut);

	await tx.fee(modelOrFee);
	await tx.sign();

	return tx;
};
