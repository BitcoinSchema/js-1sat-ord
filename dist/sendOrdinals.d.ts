import type { SendOrdinalsResult, SendOrdinalsConfig } from "./types";
/**
 * Sends ordinals to the given destinations
 * @param {SendOrdinalsConfig} config - Configuration object for sending ordinals
 * @param {Utxo[]} config.paymentUtxos - Utxos to spend (with base64 encoded scripts)
 * @param {Utxo[]} config.ordinals - Utxos to spend (with base64 encoded scripts)
 * @param {PrivateKey} config.paymentPk - Private key to sign paymentUtxos
 * @param {PrivateKey} config.ordPk - Private key to sign ordinals
 * @param {Destination[]} config.destinations - Array of destinations with addresses and inscriptions
 * @param {string} config.changeAddress - Optional. Address to send change to, if any. If not provided, defaults to paymentPk address
 * @param {number} config.satsPerKb - Optional. Satoshis per kilobyte for fee calculation. Default is DEFAULT_SAT_PER_KB
 * @param {PreMAP} config.metaData - Optional. MAP (Magic Attribute Protocol) metadata to include in inscriptions
 * @param {LocalSigner | RemoteSigner} config.signer - Optional. Signer object to sign the transaction
 * @param {Payment[]} config.additionalPayments - Optional. Additional payments to include in the transaction
 * @param {boolean} config.enforceUniformSend - Optional. Default: true. Enforce that the number of destinations matches the number of ordinals being sent. Sending ordinals requires a 1:1 mapping of destinations to ordinals. This is only used for sub-protocols like BSV21 that manage tokens without sending the inscriptions directly.
 * @returns {Promise<SendOrdinalsResult>} Transaction, spent outpoints, and change vout
 */
export declare const sendOrdinals: (config: SendOrdinalsConfig) => Promise<SendOrdinalsResult>;
