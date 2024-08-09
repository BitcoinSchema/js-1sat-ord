import { Transaction } from "@bsv/sdk";
import { type TokenUtxo, type CancelOrdListingsConfig, type CancelOrdTokenListingsConfig, type Utxo, type ChangeResult } from "./types";
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
export declare const cancelOrdTokenListings: (config: CancelOrdTokenListingsConfig) => Promise<{
    tx: Transaction;
    spentOutpoints: string[];
    payChange: Utxo | undefined;
    tokenChange: TokenUtxo;
}>;
