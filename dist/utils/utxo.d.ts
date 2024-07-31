import { type Transaction, type UnlockingScript, type TransactionInput } from "@bsv/sdk";
import { type NftUtxo, TokenType, type TokenUtxo, type Utxo } from "../types";
/**
 * Converts a Utxo object with a base64 encoded script to a Utxo object with a hex encoded script
 * @param {Utxo} utxo - Utxo object with base64 encoded script
 * @param {Object} unlockScriptTemplate - Object with sign and estimateLength functions
 * @returns {TransactionInput} Utxo object with hex encoded script
 */
export declare const inputFromB64Utxo: (utxo: Utxo, unlockScriptTemplate: {
    sign: (tx: Transaction, inputIndex: number) => Promise<UnlockingScript>;
    estimateLength: (tx: Transaction, inputIndex: number) => Promise<number>;
}) => TransactionInput;
/**
 * Fetches pay utxos from the API
 * @param {string} address - Address to fetch utxos for
 * @returns {Promise<Utxo[]>} Array of pay utxos
 */
export declare const fetchPayUtxos: (address: string, scriptEncoding?: "hex" | "base64" | "asm") => Promise<Utxo[]>;
/**
 * Fetches NFT utxos from the API
 * @param {string} address - Address to fetch utxos for
 * @param {string} [collectionId] - Optional. Collection id (collection insciprtion origin)
 * @param {number} [limit=10] - Optional. Number of utxos to fetch. Default is 10
 * @param {number} [offset=0] - Optional. Offset for fetching utxos. Default is 0
 * @returns {Promise<Utxo[]>} Array of NFT utxos
 */
export declare const fetchNftUtxos: (address: string, collectionId?: string, limit?: number, offset?: number) => Promise<NftUtxo[]>;
/**
 * Fetches token utxos from the API
 * @param {TokenType} protocol - Token protocol. Either BSV20 or BSV21
 * @param {string} tokenId - Token id. Ticker for BSV20 and id (mint+deploy inscription origin) for BSV21
 * @param {string} address - Address to fetch utxos for
 * @returns {Promise<TokenUtxo[]>} Array of token utxos
 */
export declare const fetchTokenUtxos: (protocol: TokenType, tokenId: string, address: string) => Promise<TokenUtxo[]>;
