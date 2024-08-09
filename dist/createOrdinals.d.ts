import type { CreateOrdinalsConfig, CreateOrdinalsCollectionConfig, CreateOrdinalsCollectionItemConfig, ChangeResult } from "./types";
/**
 * Creates a transaction with inscription outputs
 * @param {CreateOrdinalsConfig | CreateOrdinalsCollectionConfig | CreateOrdinalsCollectionItemConfig} config - Configuration object for creating ordinals
 * @param {Utxo[]} config.utxos - Utxos to spend (with base64 encoded scripts)
 * @param {Destination[]} config.destinations - Array of destinations with addresses and inscriptions
 * @param {PrivateKey} config.paymentPk - Private key to sign utxos
 * @param {string} config.changeAddress - Optional. Address to send change to. If not provided, defaults to paymentPk address
 * @param {number} config.satsPerKb - Optional. Satoshis per kilobyte for fee calculation. Default is DEFAULT_SAT_PER_KB
 * @param {PreMAP} config.metaData - Optional. MAP (Magic Attribute Protocol) metadata to include in inscriptions
 * @param {LocalSigner | RemoteSigner} config.signer - Optional. Local or remote signer (used for data signature)
 * @param {Payment[]} config.additionalPayments - Optional. Additional payments to include in the transaction
 * @returns {Promise<ChangeResult>} Transaction with inscription outputs
 */
export declare const createOrdinals: (config: CreateOrdinalsConfig | CreateOrdinalsCollectionConfig | CreateOrdinalsCollectionItemConfig) => Promise<ChangeResult>;
