import type { PrivateKey } from "@bsv/sdk";
import type { AuthToken } from "sigma-protocol";

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
 * @typedef {Object} Distribution
 * @property {string} address - Destination address
 * @property {string} amt - Number of tokens as a string
 */
export type Distribution = {
	address: string;
	amt: string;
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


/**
 * @typedef {Object} TokenUtxo
 * @property {string} amt - Number of tokens as a string
 * @property {string} id - Token id -  either tick or id depending on protocol
 * @property {string} satoshis - Always 1
 */
export interface TokenUtxo extends Utxo {
	amt: string;
	id: string;
	satoshis: 1;
}

export type Inscription = {
	dataB64: string;
	contentType: string;
};

export type MAP = {
	app: string;
	type: string;
	[prop: string]: string;
};

export type Payment = {
	to: string;
	amount: number;
};

export type TokenInscription = {
	p: "bsv-20";
	amt: string;
  op: "transfer" | "mint" | "deploy+mint";
};

export interface MintTokenInscription extends TokenInscription {
	op: "mint";
};

export interface DeployMintTokenInscription extends TokenInscription {
	op: "deploy+mint";
	sym: string;
	icon: string;
};

export interface TransferTokenInscription extends TokenInscription {
	p: "bsv-20";
	amt: string;
  op: "transfer";
};

export interface TransferBSV20Inscription extends TransferTokenInscription {
	tick: string;
}

export interface TransferBSV21Inscription extends TransferTokenInscription {
	id: string;
}

export enum TokenType {
	BSV20 = "bsv20",
	BSV21 = "bsv21",
}