import {
	type PrivateKey,
	type Script,
	Transaction,
	type UnlockingScript,
	P2PKH,
	SatoshisPerKilobyte,
	fromUtxo,
	type TransactionOutput,
} from "@bsv/sdk";
import { type AuthToken, Sigma } from "sigma-protocol";
import OrdP2PKH from "./ordP2pkh";

// biome-ignore lint/complexity/noBannedTypes: Reserved for future use
type Signer = {};

export interface LocalSigner extends Signer {
	idKey: PrivateKey;
}

export interface RemoteSigner extends Signer {
	keyHost: string;
	authToken?: AuthToken;
}

export type Destination = {
	address: string;
	inscription?: Inscription;
};

/**
 * @typedef {Object} Utxo
 * @property {number} satoshis - Amount in satoshis
 * @property {string} txid - Transaction id
 * @property {number} vout - Output index
 * @property {string} script - Base64 encoded locking script
 */
export type Utxo = {
	satoshis: number;
	txid: string;
	vout: number;
	script: string;
};

export type Inscription = {
	dataB64: string;
	contentType: string;
};

export type MAP = {
	app: string;
	type: string;
	[prop: string]: string | string[];
};

export type Payment = {
	to: string;
	amount: number;
};

const createOrdinals = async (
	utxos: Utxo[],
	destinations: Destination[],
	paymentPk: PrivateKey,
	changeAddress: string,
	satsPerKb?: number,
	metaData?: MAP,
	signer?: LocalSigner | RemoteSigner,
	additionalPayments: Payment[] = [],
): Promise<Transaction> => {
	const modelOrFee = new SatoshisPerKilobyte(satsPerKb || 10);
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

const sendOrdinals = async (
	paymentUtxos: Utxo[],
	ordinals: Utxo[],
	paymentPk: PrivateKey,
	changeAddress: string,
	ordPk: PrivateKey,
	destinations: Destination[],
	satsPerKb?: number,
	metaData?: MAP,
	additionalPayments: Payment[] = [],
): Promise<Transaction> => {
	const modelOrFee = new SatoshisPerKilobyte(satsPerKb || DEFAULT_SAT_PER_KB);
	const tx = new Transaction();

	// Inputs
	// Add ordinal inputs
	for (const ordUtxo of ordinals) {
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

// sendUtxos sends p2pkh utxos to the given destinationAddress
const sendUtxos = async (
	utxos: Utxo[],
	paymentPk: PrivateKey,
	destinationAddress: string,
	amount: number,
	satsPerKb?: number,
): Promise<Transaction> => {
	const modelOrFee = new SatoshisPerKilobyte(satsPerKb || DEFAULT_SAT_PER_KB);

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

export { createOrdinals, sendOrdinals, sendUtxos };

const DEFAULT_SAT_PER_KB = 10;

const fromB64Utxo = (
	utxo: Utxo,
	unlockScriptTemplate: {
		sign: (tx: Transaction, inputIndex: number) => Promise<UnlockingScript>;
		estimateLength: (tx: Transaction, inputIndex: number) => Promise<number>;
	},
) => {
	return fromUtxo(
		{
			...utxo,
			script: Buffer.from(utxo.script, "base64").toString("hex"),
		},
		unlockScriptTemplate,
	);
};
