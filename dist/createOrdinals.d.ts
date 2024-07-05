import { type PrivateKey, Transaction } from "@bsv/sdk";
import type { Utxo, Destination, MAP, LocalSigner, RemoteSigner, Payment } from "./types";
type CreateOrdinalsResult = {
    tx: Transaction;
    spentOutpoints: string[];
    payChangeVout?: number;
};
export type CreateOrdinalsConfig = {
    utxos: Utxo[];
    destinations: Destination[];
    paymentPk: PrivateKey;
    changeAddress?: string;
    satsPerKb?: number;
    metaData?: MAP;
    signer?: LocalSigner | RemoteSigner;
    additionalPayments?: Payment[];
};
/**
 * Creates a transaction with inscription outputs
 * @param {CreateOrdinalsConfig} config - Configuration object for creating ordinals
 * @param {Utxo[]} config.utxos - Utxos to spend (with base64 encoded scripts)
 * @param {Destination[]} config.destinations - Array of destinations with addresses and inscriptions
 * @param {PrivateKey} config.paymentPk - Private key to sign utxos
 * @param {string} config.changeAddress - Optional. Address to send change to. If not provided, defaults to paymentPk address
 * @param {number} config.satsPerKb - Optional. Satoshis per kilobyte for fee calculation. Default is DEFAULT_SAT_PER_KB
 * @param {MAP} config.metaData - Optional. MAP (Magic Attribute Protocol) metadata to include in inscriptions
 * @param {LocalSigner | RemoteSigner} config.signer - Optional. Local or remote signer (used for data signature)
 * @param {Payment[]} config.additionalPayments - Optional. Additional payments to include in the transaction
 * @returns {Promise<CreateOrdinalsResult>} Transaction with inscription outputs
 */
export declare const createOrdinals: (config: CreateOrdinalsConfig) => Promise<CreateOrdinalsResult>;
export {};
