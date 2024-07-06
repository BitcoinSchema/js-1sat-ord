import { type TransferOrdTokensConfig, type TransferOrdTokensResult } from "./types";
/**
 * Transfer tokens to a destination
 * @param {TransferOrdTokensConfig} config - Configuration object for transferring tokens
 * @param {TokenType} config.protocol - Token protocol. Must be TokenType.BSV20 or TokenType.BSV21
 * @param {string} config.tokenID - Token ID. Either the tick or id value depending on the protocol
 * @param {Utxo[]} config.utxos - Payment Utxos available to spend. Will only consume what is needed.
 * @param {TokenUtxo[]} config.inputTokens - Token utxos to spend
 * @param {Distribution[]} config.distributions - Array of destinations with addresses and amounts
 * @param {PrivateKey} config.paymentPk - Private key to sign paymentUtxos
 * @param {PrivateKey} config.ordPk - Private key to sign ordinals
 * @param {string} config.changeAddress - Optional. Address to send payment change to, if any. If not provided, defaults to paymentPk address
 * @param {string} config.tokenChangeAddress - Optional. Address to send token change to, if any. If not provided, defaults to ordPk address
 * @param {number} config.satsPerKb - Optional. Satoshis per kilobyte for fee calculation. Default is DEFAULT_SAT_PER_KB
 * @param {MAP} config.metaData - Optional. MAP (Magic Attribute Protocol) metadata to include in inscriptions
 * @param {LocalSigner | RemoteSigner} config.signer - Optional. Signer object to sign the transaction
 * @param {Payment[]} config.additionalPayments - Optional. Additional payments to include in the transaction
 * @returns {Promise<TransferOrdTokensResult>} Transaction with token transfer outputs
 */
export declare const transferOrdTokens: (config: TransferOrdTokensConfig) => Promise<TransferOrdTokensResult>;
