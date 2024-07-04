import {
	type PrivateKey,
	Transaction,
	SatoshisPerKilobyte,
	P2PKH,
} from "@bsv/sdk";
import OrdP2PKH from "./ordP2pkh";
import type {
	Utxo,
	Destination,
	MAP,
	LocalSigner,
	RemoteSigner,
	Payment,
} from "./types";
import { inputFromB64Utxo } from "./utils/utxo";
import { DEFAULT_SAT_PER_KB } from "./constants";
import { signData } from "./signData";

/**
 * Creates a transaction with inscription outputs
 * @param {Utxo[]} utxos - Utxos to spend (with base64 encoded scripts)
 * @param {Destination[]} destinations - Array of destinations with addresses and inscriptions
 * @param {PrivateKey} paymentPk - Private key to sign utxos
 * @param {string} changeAddress - (optional) Address to send change to. If not provided, defaults to paymentPk address
 * @param {number} satsPerKb - Satoshis per kilobyte for fee calculation. Default is DEFAULT_SAT_PER_KB
 * @param {MAP} metaData - MAP (Magic Attribute Protocol) metadata to include in inscriptions
 * @param {LocalSigner | RemoteSigner} signer - Local or remote signer (used for data signature)
 * @param {Payment[]} additionalPayments - Additional payments to include in the transaction
 * @returns {Promise<Transaction>} Transaction with inscription outputs
 */
export const createOrdinals = async (
	utxos: Utxo[],
	destinations: Destination[],
	paymentPk: PrivateKey,
	changeAddress?: string,
	satsPerKb: number = DEFAULT_SAT_PER_KB,
	metaData?: MAP,
	signer?: LocalSigner | RemoteSigner,
	additionalPayments: Payment[] = [],
): Promise<Transaction> => {
	const modelOrFee = new SatoshisPerKilobyte(satsPerKb);
	let tx = new Transaction();

	// Inputs
	for (const utxo of utxos) {
		const input = inputFromB64Utxo(utxo, new P2PKH().unlock(paymentPk));
		tx.addInput(input);
	}

	// Warn if creating many inscriptions at once
	if (destinations.length > 100) {
		console.warn(
			"Creating many inscriptions at once can be slow. Consider using multiple transactions instead.",
		);
	}

	// Outputs
	// Add inscription outputs
	for (const destination of destinations) {
		if (!destination.inscription) {
			throw new Error("Inscription is required for all destinations");
		}

		tx.addOutput({
			satoshis: 1,
			lockingScript: new OrdP2PKH().lock(
				destination.address,
				destination.inscription.dataB64,
				destination.inscription.contentType,
				metaData,
			),
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
	tx.addOutput({
		lockingScript: new P2PKH().lock(changeAddress || paymentPk.toAddress().toString()),
		change: true,
	});

	if (signer) {
		tx = await signData(tx, signer);
	}

	// Calculate fee
	await tx.fee(modelOrFee);

	// Sign the transaction
	await tx.sign();

	return tx;
};
