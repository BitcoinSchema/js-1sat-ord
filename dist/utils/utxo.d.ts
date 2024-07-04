import { type Transaction, type UnlockingScript, type TransactionInput } from "@bsv/sdk";
import type { Utxo } from "../types";
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
