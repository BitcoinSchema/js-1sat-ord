import { type PrivateKey, Transaction } from "@bsv/sdk";
import type { Utxo, Destination, MAP, LocalSigner, RemoteSigner, Payment } from "./types";
/**
 * Creates a transaction with inscription outputs
 * @param {Utxo[]} utxos - Utxos to spend (with base64 encoded scripts)
 * @param {Destination[]} destinations - Array of destinations with addresses and inscriptions
 * @param {PrivateKey} paymentPk - Private key to sign utxos
 * @param {string} changeAddress - (optional) Address to send change to. If not provided, defaults to paymentPk address
 * @param {number} satsPerKb - Satoshis per kilobyte for fee calculation. Default is DEFAULT_SAT_PER_KB
 * @param {MAP} metaData - MAP (Magic Attribute Protocol) metadata to include in inscriptions
 * @param {LocalSigner | RemoteSigner} signer - Local or remote signer (used for data signature)
 * @param {Payment[]} additionalPayments - Additional payments to include in the transaction
 * @returns {Promise<Transaction>} Transaction with inscription outputs
 */
export declare const createOrdinals: (utxos: Utxo[], destinations: Destination[], paymentPk: PrivateKey, changeAddress?: string, satsPerKb?: number, metaData?: MAP, signer?: LocalSigner | RemoteSigner, additionalPayments?: Payment[]) => Promise<Transaction>;
