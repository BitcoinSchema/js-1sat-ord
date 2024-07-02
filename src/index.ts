import {
	type PrivateKey,
	type Script,
	Transaction,
	UnlockingScript,
	P2PKH,
	LockingScript,
	SatoshisPerKilobyte,
} from "@bsv/sdk";
import type { TransactionInput, TransactionOutput } from "@bsv/sdk";
import { type AuthToken, Sigma } from "sigma-protocol";
import type FeeModel from "@bsv/sdk/dist/types/src/transaction/FeeModel";
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

export type Utxo = {
  rawTxHex: string;
  vout: number;
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

export const buildReinscriptionTemplate = async (
	ordinal: Utxo,
	destinationAddress: string,
	reinscription?: Inscription,
	metaData?: MAP,
): Promise<Transaction> => {
	// Inputs
	const txIn: TransactionInput = {
		sourceTransaction: Transaction.fromHex(ordinal.rawTxHex),
		sourceOutputIndex: ordinal.vout,
		sequence: 0,
	};

	// Outputs
	const inscriptionScript = new OrdP2PKH().lock(
		destinationAddress,
		reinscription?.dataB64,
		reinscription?.contentType,
		metaData,
	);

	const txOut: TransactionOutput = {
		satoshis: 1,
		lockingScript: inscriptionScript,
	};

	return new Transaction(1, [txIn], [txOut], 0);
};

export type Payment = {
	to: string;
	amount: number;
};

const createOrdinal = async (
	utxos: Utxo[],
	destinationAddress: string,
	paymentPk: PrivateKey,
	changeAddress: string,
	inscriptions: Inscription[],
	satsPerKb?: number,
	metaData?: MAP,
	signer?: LocalSigner | RemoteSigner,
	additionalPayments: Payment[] = [],
): Promise<Transaction> => {

	const modelOrFee = new SatoshisPerKilobyte(satsPerKb || 10);
	// Inputs
	const txIns: TransactionInput[] = utxos.map(utxo => {
			const sourceTx = Transaction.fromHex(utxo.rawTxHex);
			return {
					sourceTransaction: sourceTx,
					sourceOutputIndex: utxo.vout,
					unlockingScriptTemplate: new P2PKH().unlock(paymentPk),
					sequence: 0xffffffff,
			};
	});

	// Warn if creating many inscriptions at once
	if (inscriptions.length > 100) {
			console.warn("Creating many inscriptions at once can be slow. Consider using multiple transactions instead.");
	}

	// Outputs
	const txOuts: TransactionOutput[] = [];

	// Add inscription outputs
	for (const inscription of inscriptions) {
			const inscriptionScript = new OrdP2PKH().lock(
					destinationAddress,
					inscription.dataB64,
					inscription.contentType,
					metaData,
			);

			txOuts.push({
					satoshis: 1,
					lockingScript: inscriptionScript,
			});
	}

	// Add additional payments if any
	for (const p of additionalPayments) {
			txOuts.push({
					satoshis: p.amount,
					lockingScript: new P2PKH().lock(p.to),
			} as TransactionOutput);
	}

	// Add change output
	const changeScript = new P2PKH().lock(changeAddress);
	txOuts.push({
			lockingScript: changeScript,
			change: true,
	} as TransactionOutput);

	let tx = new Transaction(1, txIns, txOuts, 0);

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

const transferOrdinal = async (
	paymentUtxos: Utxo[],
	ordinals: Utxo[],
	paymentPk: PrivateKey,
	changeAddress: string,
	ordPk: PrivateKey,
	ordDestinationAddress: string,
	satsPerKb: number,
	reinscription?: Inscription,
	metaData?: MAP,
	additionalPayments: Payment[] = [],
): Promise<Transaction> => {

	const modelOrFee = new SatoshisPerKilobyte(satsPerKb || 10);

	// Inputs
	const txIns: TransactionInput[] = [];

	// Add ordinal inputs
	for (const ordinal of ordinals) {
			const ordinalTx = Transaction.fromHex(ordinal.rawTxHex);
			const ordIn: TransactionInput = {
					sourceTransaction: ordinalTx,
					sourceOutputIndex: ordinal.vout,
					unlockingScriptTemplate: new OrdP2PKH().unlock(
							ordPk,
							undefined,
							undefined,
							undefined,
							LockingScript.fromASM(ordinalTx.outputs[ordinal.vout].lockingScript.toASM())
					),
					sequence: 0xffffffff,
			};
			txIns.push(ordIn);
	}

	// Add payment inputs
	for (const paymentUtxo of paymentUtxos) {
			const paymentTx = Transaction.fromHex(paymentUtxo.rawTxHex);
			const utxoIn: TransactionInput = {
					sourceTransaction: paymentTx,
					sourceOutputIndex: paymentUtxo.vout,
					unlockingScriptTemplate: new P2PKH().unlock(paymentPk),
					sequence: 0xffffffff,
			};
			txIns.push(utxoIn);
	}

	// Outputs
	const txOuts: TransactionOutput[] = [];

	// Add ordinal outputs
	for (const ordinal of ordinals) {
			let s: Script;
			if (reinscription?.dataB64 && reinscription?.contentType) {
					s = new OrdP2PKH().lock(
							ordDestinationAddress,
							reinscription.dataB64,
							reinscription.contentType,
							metaData,
					);
			} else {
					s = new P2PKH().lock(ordDestinationAddress);
			}

			txOuts.push({
					satoshis: 1,
					lockingScript: s,
			});
	}

	// Add additional payments if any
	for (const p of additionalPayments) {
			txOuts.push({
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
	txOuts.push(changeOut);

	const tx = new Transaction(1, txIns, txOuts, 0);

	await tx.fee(modelOrFee);
	await tx.sign();

	return tx;
};

// sendUtxos sends p2pkh utxos to the given destinationAddress
const sendUtxos = async (
  utxos: Utxo[],
  paymentPk: PrivateKey,
  destinationAddress: string,
  satsPerKb: number,
	amount: number,
): Promise<Transaction> => {
	const modelOrFee = new SatoshisPerKilobyte(satsPerKb || 10);

  // Inputs
  const txIns: TransactionInput[] = utxos.map(utxo => {
      const sourceTx = Transaction.fromHex(utxo.rawTxHex);
      
      return {
          sourceTransaction: sourceTx,
          sourceOutputIndex: utxo.vout,
          unlockingScriptTemplate: new P2PKH().unlock(paymentPk),
          sequence: 0xffffffff,
      };
  });

  // Outputs
	const txOuts: TransactionOutput[] = [];

  const sendTxOut: TransactionOutput = {
      satoshis: amount,
      lockingScript: new P2PKH().lock(destinationAddress),
  };

	txOuts.push(sendTxOut);

	// Change
	const changeAddress = paymentPk.toAddress().toString();
	const changeScript = new P2PKH().lock(changeAddress);

	const changeOut: TransactionOutput = {
		lockingScript: changeScript,
		change: true,
	};

	txOuts.push(changeOut);

  // Create transaction
  const tx = new Transaction(1, txIns, txOuts, 0);

  // Calculate fee
  await tx.fee(modelOrFee);

  // Sign the transaction
  await tx.sign();

  return tx;
};

export { createOrdinal, transferOrdinal, sendUtxos };
