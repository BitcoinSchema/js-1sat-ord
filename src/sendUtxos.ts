import { type PrivateKey, Transaction, SatoshisPerKilobyte, P2PKH, type TransactionOutput } from "@bsv/sdk";
import { DEFAULT_SAT_PER_KB } from "./constants";
import type { Utxo } from "./types";
import { fromB64Utxo } from "./utils/utxo";

// sendUtxos sends p2pkh utxos to the given destinationAddress
export const sendUtxos = async (
	utxos: Utxo[],
	paymentPk: PrivateKey,
	destinationAddress: string,
	amount: number,
	satsPerKb: number = DEFAULT_SAT_PER_KB,
): Promise<Transaction> => {
	const modelOrFee = new SatoshisPerKilobyte(satsPerKb);

	const tx = new Transaction();

	// Inputs
	for (const utxo of utxos) {
		const input = fromB64Utxo(utxo, new P2PKH().unlock(paymentPk));
		tx.addInput(input);
	}

	// Outputs
	const sendTxOut: TransactionOutput = {
		satoshis: amount,
		lockingScript: new P2PKH().lock(destinationAddress),
	};

	tx.addOutput(sendTxOut);

	// Change
	const changeAddress = paymentPk.toAddress().toString();
	const changeScript = new P2PKH().lock(changeAddress);

	const changeOut: TransactionOutput = {
		lockingScript: changeScript,
		change: true,
	};

	tx.addOutput(changeOut);

	// Calculate fee
	await tx.fee(modelOrFee);

	// Sign the transaction
	await tx.sign();

	return tx;
};