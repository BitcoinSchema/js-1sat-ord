import { type PrivateKey, Transaction } from "@bsv/sdk";
import type { Distribution, Utxo } from "./types";
/**
 * Deploys & Mints a BSV21 token to the given destination address
 * @param {string} symbol - Token ticker symbol
 * @param {string} icon - outpoint (format: txid_vout) or relative output index of the icon (format _vout). examples: ecb483eda58f26da1b1f8f15b782b1186abdf9c6399a1c3e63e0d429d5092a41_0 or _1
 * @param {Utxo[]} utxos - Payment Utxos available to spend. Will only consume what is needed.
 * @param {Distribution} initialDistribution - Initial distribution with addresses and total supply
 * @param {PrivateKey} paymentPk - Private key to sign paymentUtxos
 * @param {string} destinationAddress - Address to deploy token to.
 * @param {string} changeAddress - (optional) Address to send payment change to, if any. If not provided, defaults to paymentPk address
 * @returns {Promise<Transaction>} Transaction to deploy BSV 2.1 token
 */
export declare const deployBsv21Token: (symbol: string, icon: string, utxos: Utxo[], initialDistribution: Distribution, paymentPk: PrivateKey, destinationAddress: string, changeAddress?: string) => Promise<Transaction>;
