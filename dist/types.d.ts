import type { PrivateKey } from "@bsv/sdk";
import type { AuthToken } from "sigma-protocol";
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
export {};
