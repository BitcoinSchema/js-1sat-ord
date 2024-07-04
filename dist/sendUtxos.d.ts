import { type PrivateKey, Transaction } from "@bsv/sdk";
import type { Payment, Utxo } from "./types";
/**
 * Sends utxos to the given destination
 * @param {Utxo[]} utxos - Utxos to spend (with base64 encoded scripts)
 * @param {PrivateKey} paymentPk - Private key to sign utxos
 * @param {Payment[]} payments - Array of payments with addresses and amounts
 * @param {number} satsPerKb - Satoshis per kilobyte for fee calculation. Default is DEFAULT_SAT_PER_KB
 * @returns {Promise<Transaction>} Transaction with utxo outputs
 */
export declare const sendUtxos: (utxos: Utxo[], paymentPk: PrivateKey, payments: Payment[], satsPerKb?: number) => Promise<Transaction>;
