import { type PrivateKey, Transaction } from "@bsv/sdk";
import type { Distribution, IconInscription, Payment, Utxo } from "./types";
/**
 * Deploys & Mints a BSV21 token to the given destination address
 * @param {string} symbol - Token ticker symbol
 * @param {string | IconInscription} icon - outpoint (format: txid_vout) or Inscription. If Inscription, must be a valid image type
 * @param {Utxo[]} utxos - Payment Utxos available to spend. Will only consume what is needed.
 * @param {Distribution} initialDistribution - Initial distribution with addresses and total supply
 * @param {PrivateKey} paymentPk - Private key to sign paymentUtxos
 * @param {string} destinationAddress - Address to deploy token to.
 * @param {string} changeAddress - (optional) Address to send payment change to, if any. If not provided, defaults to paymentPk address
 * @param {number} satsPerKb - (optional) Satoshis per kilobyte for fee calculation. Default is DEFAULT_SAT_PER_KB
 * @param {Payment[]} additionalPayments - (optional) Additional payments to include in the transaction
 * @returns {Promise<Transaction>} Transaction to deploy BSV 2.1 token
 */
export declare const deployBsv21Token: (symbol: string, icon: string | IconInscription, utxos: Utxo[], initialDistribution: Distribution, paymentPk: PrivateKey, destinationAddress: string, changeAddress?: string, satsPerKb?: number, additionalPayments?: Payment[]) => Promise<Transaction>;
