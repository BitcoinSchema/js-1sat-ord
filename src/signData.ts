import type { Transaction } from "@bsv/sdk";
import { Sigma } from "sigma-protocol";
import type { LocalSigner, RemoteSigner } from "./types";

/**
 * Signs data in the transaction with Sigma protocol
 * @param {Transaction} tx - Transaction to sign
 * @param {LocalSigner | RemoteSigner} signer - Local or remote signer (used for data signature)
 * @returns {Transaction} Transaction with signed data
 */
export const signData = async (
	tx: Transaction,
	signer: LocalSigner | RemoteSigner,
): Promise<Transaction> => {
	// Sign tx if idKey or remote signer like starfish/tokenpass
	const idKey = (signer as LocalSigner)?.idKey;
	const keyHost = (signer as RemoteSigner)?.keyHost;

	if (idKey) {
		const sigma = new Sigma(tx);
		const { signedTx } = sigma.sign(idKey);
		return signedTx;
	}
	if (keyHost) {
		const authToken = (signer as RemoteSigner)?.authToken;
		const sigma = new Sigma(tx);
		try {
			const { signedTx } = await sigma.remoteSign(keyHost, authToken);
			return signedTx;
		} catch (e) {
			console.log(e);
			throw new Error(`Remote signing to ${keyHost} failed`);
		}
	}
	throw new Error("Signer must be a LocalSigner or RemoteSigner");
};
