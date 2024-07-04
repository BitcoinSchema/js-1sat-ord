import type { PrivateKey, Transaction } from "@bsv/sdk";
import { type Distribution, type LocalSigner, type MAP, type Payment, type RemoteSigner, TokenType, type TokenUtxo, type Utxo } from "./types";
/**
 * Transfer tokens to a destination
 * @param {TokenType} protocol - Token protocol. Must be TokenType.BSV20 or TokenType.BSV21
 * @param {string} tokenID - Token ID. Either the tick or id value depending on the protocol
 * @param {Utxo[]} utxos - Payment Utxos available to spend. Will only consume what is needed.
 * @param {TokenUtxo[]} inputTokens - Token utxos to spend
 * @param {Distribution[]} distributions - Array of destinations with addresses and amounts
 * @param {PrivateKey} paymentPk - Private key to sign paymentUtxos
 * @param {PrivateKey} ordPk - Private key to sign ordinals
 * @param {string} changeAddress - Address to send payment change to, if any. If not provided, defaults to paymentPk address
 * @param {string} tokenChangeAddress - Address to send token change to, if any. If not provided, defaults to ordPk address
 * @param {number} satsPerKb - (optional) Satoshis per kilobyte for fee calculation. Default is DEFAULT_SAT_PER_KB
 * @param {MAP} metaData - (optional) MAP (Magic Attribute Protocol) metadata to include in inscriptions
 * @param {LocalSigner | RemoteSigner} signer - (optional) Signer object to sign the transaction
 * @param {Payment[]} additionalPayments - (optional) Additional payments to include in the transaction
 * @returns {Promise<Transaction>} Transaction with token transfer outputs
 */
export declare const transferOrdTokens: (protocol: TokenType, tokenID: string, utxos: Utxo[], inputTokens: TokenUtxo[], distributions: Distribution[], paymentPk: PrivateKey, ordPk: PrivateKey, changeAddress?: string, tokenChangeAddress?: string, satsPerKb?: number, metaData?: MAP, signer?: LocalSigner | RemoteSigner, additionalPayments?: Payment[]) => Promise<Transaction>;
