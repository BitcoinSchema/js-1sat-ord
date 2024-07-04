import { type PrivateKey, Transaction } from "@bsv/sdk";
import type { Utxo, Destination, MAP, Payment, LocalSigner, RemoteSigner } from "./types";
/**
 * Sends ordinals to the given destinations
 * @param {Utxo[]} paymentUtxos - Utxos to spend (with base64 encoded scripts)
 * @param {Utxo[]} ordinals - Utxos to spend (with base64 encoded scripts)
 * @param {PrivateKey} paymentPk - Private key to sign paymentUtxos
 * @param {PrivateKey} ordPk - Private key to sign ordinals
 * @param {Destination[]} destinations - Array of destinations with addresses and inscriptions
 * @param {string} changeAddress - (optional) Address to send change to, if any. If not provided, defaults to paymentPk address
 * @param {number} satsPerKb - (optional) Satoshis per kilobyte for fee calculation. Default is DEFAULT_SAT_PER_KB
 * @param {MAP} metaData - (optional) MAP (Magic Attribute Protocol) metadata to include in inscriptions
 * @param {Payment[]} additionalPayments -(optional)  Additional payments to include in the transaction
 * @param {boolean} enforceUniformSend - (optional) Enforce that the number of destinations matches the number of ordinals being sent. Sending ordinals requires a 1:1 mapping of destinations to ordinals. Default is true. This is only used for sub-protocols like BSV21 that manage tokens without sending the inscriptions directly.
 * @returns {Promise<Transaction>} Transaction with inscription outputs
 */
export declare const sendOrdinals: (paymentUtxos: Utxo[], ordinals: Utxo[], paymentPk: PrivateKey, ordPk: PrivateKey, destinations: Destination[], changeAddress?: string, satsPerKb?: number, metaData?: MAP, signer?: LocalSigner | RemoteSigner, additionalPayments?: Payment[], enforceUniformSend?: boolean) => Promise<Transaction>;
