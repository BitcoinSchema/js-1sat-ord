import { type CancelOrdListingsConfig, type CancelOrdTokenListingsConfig, type ChangeResult, type TokenChangeResult } from "./types";
/**
 * Cancel Ordinal Listings
 * @param {CancelOrdListingsConfig} config - Configuration object for cancelling ordinals
 * @param {PrivateKey} config.paymentPk - Private key to sign payment inputs
 * @param {PrivateKey} config.ordPk - Private key to sign ordinals
 * @param {Utxo[]} config.utxos - Utxos to spend (with base64 encoded scripts)
 * @param {Utxo[]} config.listingUtxos - Listing utxos to cancel (with base64 encoded scripts)
 * @param {string} [config.changeAddress] - Optional. Address to send change to
 * @param {number} [config.satsPerKb] - Optional. Satoshis per kilobyte for fee calculation
 * @param {Payment[]} [config.additionalPayments] - Optional. Additional payments to make
 * @returns {Promise<ChangeResult>} Transaction, spent outpoints, change utxo
 */
export declare const cancelOrdListings: (config: CancelOrdListingsConfig) => Promise<ChangeResult>;
/**
 * Cancel Ordinal Token Listings
 * @param {CancelOrdTokenListingsConfig} config - Configuration object for cancelling token ordinals
 * @param {PrivateKey} config.paymentPk - Private key to sign payment inputs
 * @param {PrivateKey} config.ordPk - Private key to sign ordinals
 * @param {Utxo[]} config.utxos - Utxos to spend (with base64 encoded scripts)
 * @param {Utxo[]} config.listingUtxos - Listing utxos to cancel (with base64 encoded scripts)
 * @param {string} config.tokenID - Token ID of the token to cancel listings for
 * @param {string} config.ordAddress - Address to send the cancelled token to
 * @param {number} [config.satsPerKb] - Optional. Satoshis per kilobyte for fee calculation
 * @param {Payment[]} [config.additionalPayments] - Optional. Additional payments to make
 * @returns {Promise<TokenChangeResult>} Transaction, spent outpoints, change utxo, token change utxos
 */
export declare const cancelOrdTokenListings: (config: CancelOrdTokenListingsConfig) => Promise<TokenChangeResult>;
