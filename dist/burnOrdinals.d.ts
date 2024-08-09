import type { BaseResult, BurnOrdinalsConfig } from "./types";
/**
 * Burn ordinals by consuming them as fees
 * @param {BurnOrdinalsConfig} config - Configuration object for sending ordinals
 * @param {PrivateKey} config.ordPk - Private key to sign ordinals
 * @param {Utxo} config.ordinals - 1Sat Ordinal Utxos to spend (with base64 encoded scripts)
 * @param {metaData} [config.metaData] - Optional. MAP (Magic Attribute Protocol) metadata to include in an unspendable output OP_FALSE OP_RETURN
 * @returns {Promise<BaseResult>} Transaction, spent outpoints
 */
export declare const burnOrdinals: (config: BurnOrdinalsConfig) => Promise<BaseResult>;
