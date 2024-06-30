import {
	type PrivateKey,
	type Script,
	Transaction,
	UnlockingScript,
	P2PKH,
	LockingScript,
} from "@bsv/sdk";
import type { TransactionInput, TransactionOutput } from "@bsv/sdk";
import * as dotenv from "dotenv";
import { type AuthToken, Sigma } from "sigma-protocol";
import { toHex } from "./utils/strings";

dotenv.config();

// biome-ignore lint/complexity/noBannedTypes: <explanation>
type Signer = {};

export interface LocalSigner extends Signer {
	idKey: PrivateKey;
}

export interface RemoteSigner extends Signer {
	keyHost: string;
	authToken?: AuthToken;
}

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

const MAP_PREFIX = "1PuQa7K62MiKCtssSLKy1kh56WWU7MtUR5";

const buildInscription = (
	destinationAddress: string,
	b64File?: string | undefined,
	mediaType?: string | undefined,
	metaData?: MAP | undefined,
): Script => {
	let ordAsm = "";
	// This can be omitted for reinscriptions that just update metadata
	if (b64File !== undefined && mediaType !== undefined) {
		const ordHex = toHex("ord");
		const fsBuffer = Buffer.from(b64File, "base64");
		const fireShardHex = fsBuffer.toString("hex").trim();
		const fireShardMediaType = toHex(mediaType);
		ordAsm = `OP_0 OP_IF ${ordHex} OP_1 ${fireShardMediaType} OP_0 ${fireShardHex ? `${fireShardHex} `: ''}OP_ENDIF`;
	}

	// Create ordinal output and inscription in a single output
	const lockingScript = new P2PKH().lock(destinationAddress);
	let inscriptionAsm = `${lockingScript.toASM()}${ordAsm ? ` ${ordAsm}` : ""}`;

	// MAP.app and MAP.type keys are required
	if (metaData?.app && metaData?.type) {
		const mapPrefixHex = toHex(MAP_PREFIX);
		const mapCmdValue = toHex("SET");
		inscriptionAsm = `${inscriptionAsm} OP_RETURN ${mapPrefixHex} ${mapCmdValue}`;

		for (const [key, value] of Object.entries(metaData)) {
			if (key !== "cmd") {
				inscriptionAsm = `${inscriptionAsm} ${toHex(key)} ${toHex(
					value as string,
				)}`;
			}
		}
	}

	return LockingScript.fromASM(inscriptionAsm);
};

export const buildReinscriptionTemplate = async (
	ordinal: Utxo,
	destinationAddress: string,
	reinscription?: Inscription,
	metaData?: MAP,
): Promise<Transaction> => {
	// Inputs
	const txIn: TransactionInput = {
		sourceTXID: ordinal.txid,
		sourceOutputIndex: ordinal.vout,
		unlockingScript: UnlockingScript.fromASM(ordinal.script),
		sequence: 0,
	};

	// Outputs
	const inscriptionScript = buildInscription(
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
	utxo: Utxo,
	destinationAddress: string,
	paymentPk: PrivateKey,
	changeAddress: string,
	satPerByteFee: number,
	inscription: Inscription,
	metaData?: MAP,
	signer?: LocalSigner | RemoteSigner,
	additionalPayments: Payment[] = [],
): Promise<Transaction> => {
	const p2pkh = new P2PKH();

	// Inputs
	const utxoIn: TransactionInput = {
		sourceTXID: utxo.txid,
		sourceOutputIndex: utxo.vout,
		unlockingScriptTemplate: p2pkh.unlock(paymentPk),
		sequence: 0xffffffff,
	};

	// Outputs
	const inscriptionScript = buildInscription(
		destinationAddress,
		inscription.dataB64,
		inscription.contentType,
		metaData,
	);

	const txOuts: TransactionOutput[] = [];

	txOuts.push({
		satoshis: 1,
		lockingScript: inscriptionScript,
	});

	// add additional payments if any
	for (const p of additionalPayments) {
		txOuts.push({
			satoshis: p.amount,
			lockingScript: new P2PKH().lock(p.to),
		} as TransactionOutput);
	}

	// total the outputs
	let totalOut = 0;

	for (const txOut of txOuts) {
		totalOut += txOut.satoshis || 0;
	}

	// add change
	const changeScript = new P2PKH().lock(changeAddress);

	txOuts.push({
		lockingScript: changeScript,
		change: true,
	} as TransactionOutput);

	const tx = new Transaction(1, [utxoIn], txOuts, 0);
	await tx.fee();
	const fee = tx.getFee() + P2PKH_OUTPUT_SIZE + P2PKH_INPUT_SCRIPT_SIZE;

	// sign tx if idKey or remote signer like starfish/tokenpass
	const idKey = (signer as LocalSigner)?.idKey;
	const keyHost = (signer as RemoteSigner)?.keyHost;

  // TODO: Update Sigma lib to use ts-sdk
	if (idKey) {
	  // input txids are available so sigma signature
	  // can be final before signing the tx
	  // const sigma = new Sigma(tx);
	  // const { signedTx } = sigma.sign(idKey);
	  // tx = signedTx;
	} else if (keyHost) {
	  const authToken = (signer as RemoteSigner)?.authToken;
	  // const sigma = new Sigma(tx);
	  // try {
	  //   const { signedTx } = await sigma.remoteSign(keyHost, authToken);
	  //   tx = signedTx;
	  // } catch (e) {
	  //   console.log(e);
	  //   throw new Error(`Remote signing to ${keyHost} failed`);
	  // }
	}
	await tx.sign();

	return tx;
};

const sendOrdinal = async (
	paymentUtxo: Utxo,
	ordinal: Utxo,
	paymentPk: PrivateKey,
	changeAddress: string,
	satPerByteFee: number,
	ordPk: PrivateKey,
	ordDestinationAddress: string,
	reinscription?: Inscription,
	metaData?: MAP,
	additionalPayments: Payment[] = [],
): Promise<Transaction> => {


	// Inputs
  const txIns: TransactionInput[] = [];
  const ordIn: TransactionInput = {
    sourceTXID: ordinal.txid,
    sourceOutputIndex: ordinal.vout,
    unlockingScript: UnlockingScript.fromASM(ordinal.script),
    unlockingScriptTemplate: new P2PKH().unlock(ordPk),
    sequence: 0xffffffff,
  };
  
  txIns.push(ordIn);

  const utxoIn: TransactionInput = {
    sourceTXID: paymentUtxo.txid,
    sourceOutputIndex: paymentUtxo.vout,
    unlockingScriptTemplate: new P2PKH().unlock(paymentPk),
    sequence: 0xffffffff,
  };

  txIns.push(utxoIn);

  // Outputs
	let s: Script;
	
	if (reinscription?.dataB64 && reinscription?.contentType) {
		s = buildInscription(
			ordDestinationAddress,
			reinscription.dataB64,
			reinscription.contentType,
			metaData,
		);
	} else {
		s = new P2PKH().lock(ordDestinationAddress);
	}
	// let satOut = new TxOut(BigInt(1), s);
	// tx.add_output(satOut);

  const txOuts: TransactionOutput[] = [];
  txOuts.push({
    satoshis: 1,
    lockingScript: s,
  });

	// add additional payments if any
	for (const p of additionalPayments) {
    txOuts.push({
      satoshis: p.amount,
      lockingScript: new P2PKH().lock(p.to),
    });
	}

	// total the outputs
	// let totalOut = 0n;
	// let numOuts = tx.get_noutputs();
	// for (const i of Array(numOuts).keys()) {
	// 	totalOut += tx.get_output(i)?.get_satoshis() || 0n;
	// }
  

	// add change
	// const changeaddr = P2PKHAddress.from_string(changeAddress);
	const changeScript = new P2PKH().lock(changeAddress);

	// const fee = Math.ceil(
	// 	satPerByteFee *
	// 		(tx.get_size() + P2PKH_OUTPUT_SIZE + 2 * P2PKH_INPUT_SCRIPT_SIZE),
	// );
	// const change = BigInt(paymentUtxo.satoshis) - totalOut - BigInt(fee);
	// let changeOut = new TxOut(change, changeScript);

	// tx.add_output(changeOut);

  const changeOut: TransactionOutput = {
    satoshis: paymentUtxo.satoshis - 1,
    lockingScript: changeScript,
    change: true,
  };
  txOuts.push(changeOut);

  const tx = new Transaction(1, txIns, txOuts, 0);

	// sign ordinal
	// const sig = tx.sign(
	// 	ordPk,
	// 	SigHash.InputOutput,
	// 	0,
	// 	Script.from_asm_string(ordinal.script),
	// 	BigInt(ordinal.satoshis),
	// );

	// ordIn.set_unlocking_script(
	// 	Script.from_asm_string(`${sig.to_hex()} ${ordPk.to_public_key().to_hex()}`),
	// );

	// tx.set_input(0, ordIn);

	// sign fee payment
	// const sig2 = tx.sign(
	// 	paymentPk,
	// 	SigHash.InputOutput,
	// 	1,
	// 	Script.from_asm_string(paymentUtxo.script),
	// 	BigInt(paymentUtxo.satoshis),
	// );

	// utxoIn.set_unlocking_script(
	// 	Script.from_asm_string(
	// 		`${sig2.to_hex()} ${paymentPk.to_public_key().to_hex()}`,
	// 	),
	// );

	// tx.set_input(1, utxoIn);

  await tx.fee();
  await tx.sign();

	return tx;
};

// sendUtxos sends p2pkh utxos to the given destinationAddress
const sendUtxos = async (
	utxos: Utxo[],
	paymentPk: PrivateKey,
	address: string,
	feeSats: number,
): Promise<Transaction> => {
	// const tx = new Transaction(1, 0);

	// // Outputs
	// let inputValue = 0;
	// for (let u of utxos || []) {
	// 	inputValue += u.satoshis;
	// }
	// const satsIn = inputValue;
	// const satsOut = satsIn - feeSats;
	// console.log({ feeSats, satsIn, satsOut });
	// tx.add_output(new TxOut(BigInt(satsOut), address.get_locking_script()));

	// // build txins from our UTXOs
	// let idx = 0;
	// for (let u of utxos || []) {
	// 	console.log({ u });
	// 	const inx = new TxIn(
	// 		Buffer.from(u.txid, "hex"),
	// 		u.vout,
	// 		Script.from_asm_string(""),
	// 	);
	// 	console.log({ inx });
	// 	inx.set_satoshis(BigInt(u.satoshis));
	// 	tx.add_input(inx);

	// 	const sig = tx.sign(
	// 		paymentPk,
	// 		SigHash.InputOutputs,
	// 		idx,
	// 		Script.from_asm_string(u.script),
	// 		BigInt(u.satoshis),
	// 	);

	// 	inx.set_unlocking_script(
	// 		Script.from_asm_string(
	// 			`${sig.to_hex()} ${paymentPk.to_public_key().to_hex()}`,
	// 		),
	// 	);

	// 	tx.set_input(idx, inx);
	// 	idx++;
	// }
	return new Transaction(1, [], [], 0);
};

export const P2PKH_INPUT_SCRIPT_SIZE = 107;
export const P2PKH_FULL_INPUT_SIZE = 148;
export const P2PKH_OUTPUT_SIZE = 34;

export { buildInscription, createOrdinal, sendOrdinal, sendUtxos };
