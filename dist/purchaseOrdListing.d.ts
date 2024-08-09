import { Transaction } from "@bsv/sdk";
import { type ChangeResult, type PurchaseOrdListingConfig, type PurchaseOrdTokenListingConfig, type Utxo } from "./types";
/**
 * Purchase a listing
 * @param {PurchaseOrdListingConfig} config - Configuration object for purchasing a listing
 * @param {Utxo[]} config.utxos - Utxos to spend (with base64 encoded scripts)
 * @param {PrivateKey} config.paymentPk - Private key to sign payment inputs
 * @param {ExistingListing} config.listing - Listing to purchase
 * @param {string} config.ordAddress - Address to send the ordinal to
 * @param {string} [config.changeAddress] - Optional. Address to send change to
 * @param {number} [config.satsPerKb] - Optional. Satoshis per kilobyte for fee calculation
 * @param {Payment[]} [config.additionalPayments] - Optional. Additional payments to make
 * @param {Royalty[]} [config.royalties] - Optional. Royalties to pay
 * @returns {Promise<ChangeResult>} Transaction, spent outpoints, change utxo
 */
export declare const purchaseOrdListing: (config: PurchaseOrdListingConfig) => Promise<ChangeResult>;
export declare const purchaseOrdTokenListing: (config: PurchaseOrdTokenListingConfig) => Promise<{
    tx: Transaction;
    spentOutpoints: string[];
    payChange: Utxo | undefined;
}>;
