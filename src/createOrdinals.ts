import { type PrivateKey, Transaction, SatoshisPerKilobyte, P2PKH } from "@bsv/sdk";
import { Sigma } from "sigma-protocol";
import OrdP2PKH from "./ordP2pkh";
import type { Utxo, Destination, MAP, LocalSigner, RemoteSigner, Payment } from "./types";
import { fromB64Utxo } from "./utils/utxo";
import { DEFAULT_SAT_PER_KB } from "./constants";

export const createOrdinals = async (
	utxos: Utxo[],
	destinations: Destination[],
	paymentPk: PrivateKey,
	changeAddress: string,
	satsPerKb: number = DEFAULT_SAT_PER_KB,
	metaData?: MAP,
	signer?: LocalSigner | RemoteSigner,
	additionalPayments: Payment[] = [],
): Promise<Transaction> => {
	const modelOrFee = new SatoshisPerKilobyte(satsPerKb);
	let tx = new Transaction();

	// Inputs
	for (const utxo of utxos) {
		const input = fromB64Utxo(utxo, new P2PKH().unlock(paymentPk));
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
		lockingScript: new P2PKH().lock(changeAddress),
		change: true,
	});

	// Sign tx if idKey or remote signer like starfish/tokenpass
	const idKey = (signer as LocalSigner)?.idKey;
	const keyHost = (signer as RemoteSigner)?.keyHost;

	if (idKey) {
		const sigma = new Sigma(tx);
		const { signedTx } = sigma.sign(idKey);
		tx = signedTx;
	} else if (keyHost) {
		const authToken = (signer as RemoteSigner)?.authToken;
		const sigma = new Sigma(tx);
		try {
			const { signedTx } = await sigma.remoteSign(keyHost, authToken);
			tx = signedTx;
		} catch (e) {
			console.log(e);
			throw new Error(`Remote signing to ${keyHost} failed`);
		}
	}

	await tx.fee(modelOrFee);
	await tx.sign();

	return tx;
};