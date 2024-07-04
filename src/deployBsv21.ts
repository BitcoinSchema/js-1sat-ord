import { type PrivateKey, Transaction, P2PKH } from "@bsv/sdk";
import type { DeployMintTokenInscription, Distribution, Utxo } from "./types";
import { inputFromB64Utxo } from "./utils/utxo";
import { validIconFormat } from "./utils/icon";
import OrdP2PKH from "./ordP2pkh";

/**
 * Deploys & Mints a BSV21 token to the given destination address
 * @param {string} symbol - Token ticker symbol
 * @param {string} icon - outpoint (format: txid_vout) or relative output index of the icon (format _vout). examples: ecb483eda58f26da1b1f8f15b782b1186abdf9c6399a1c3e63e0d429d5092a41_0 or _1
 * @param {Utxo[]} utxos - Payment Utxos available to spend. Will only consume what is needed.
 * @param {Distribution} initialDistribution - Initial distribution with addresses and total supply
 * @param {PrivateKey} paymentPk - Private key to sign paymentUtxos
 * @param {string} destinationAddress - Address to deploy token to.
 * @param {string} changeAddress - (optional) Address to send payment change to, if any. If not provided, defaults to paymentPk address
 * @returns {Promise<Transaction>} Transaction to deploy BSV 2.1 token
 */
export const deployBsv21Token = async (
	symbol: string,
	icon: string,
	utxos: Utxo[],
	initialDistribution: Distribution,
	paymentPk: PrivateKey,
	destinationAddress: string,
	changeAddress?: string,
): Promise<Transaction> => {
	const tx = new Transaction();

	// Ensure the icon format
	if (!validIconFormat(icon)) {
		throw new Error(
			"Invalid icon format. Must be either outpoint (format: txid_vout) or relative output index of the icon (format _vout). examples: ecb483eda58f26da1b1f8f15b782b1186abdf9c6399a1c3e63e0d429d5092a41_0 or _1",
		);
	}

	// Inputs
	for (const utxo of utxos) {
		const input = inputFromB64Utxo(utxo, new P2PKH().unlock(paymentPk));
		tx.addInput(input);
	}

	// Outputs
	const fileData: DeployMintTokenInscription = {
		p: "bsv-20",
		op: "deploy+mint",
		sym: symbol,
		icon,
		amt: initialDistribution.amt,
	};

	const b64File = Buffer.from(JSON.stringify(fileData)).toString("base64");
	const sendTxOut = {
		satoshis: 1,
		lockingScript: new OrdP2PKH().lock(
			destinationAddress,
			b64File,
			"application/bsv-20",
		),
	};
	tx.addOutput(sendTxOut);

	// Change
	const change = changeAddress || paymentPk.toAddress().toString();
	const changeScript = new P2PKH().lock(change);
	const changeOut = {
		lockingScript: changeScript,
		change: true,
	};
	tx.addOutput(changeOut);

	return tx;
};
