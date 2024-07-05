import { type PrivateKey, Transaction } from "@bsv/sdk";
import type { Distribution, IconInscription, Payment, Utxo } from "./types";
type DeployBsv21TokenResult = {
    tx: Transaction;
    spentOutpoints: string[];
    payChangeVout: number;
};
export type DeployBsv21TokenConfig = {
    symbol: string;
    icon: string | IconInscription;
    utxos: Utxo[];
    initialDistribution: Distribution;
    paymentPk: PrivateKey;
    destinationAddress: string;
    changeAddress?: string;
    satsPerKb?: number;
    additionalPayments?: Payment[];
};
/**
 * Deploys & Mints a BSV21 token to the given destination address
 * @param {DeployBsv21TokenConfig} config - Configuration object for deploying BSV21 token
 * @param {string} config.symbol - Token ticker symbol
 * @param {string | IconInscription} config.icon - outpoint (format: txid_vout) or Inscription. If Inscription, must be a valid image type
 * @param {Utxo[]} config.utxos - Payment Utxos available to spend. Will only consume what is needed.
 * @param {Distribution} config.initialDistribution - Initial distribution with addresses and total supply
 * @param {PrivateKey} config.paymentPk - Private key to sign paymentUtxos
 * @param {string} config.destinationAddress - Address to deploy token to.
 * @param {string} config.changeAddress - Optional. Address to send payment change to, if any. If not provided, defaults to paymentPk address
 * @param {number} config.satsPerKb - Optional. Satoshis per kilobyte for fee calculation. Default is DEFAULT_SAT_PER_KB
 * @param {Payment[]} config.additionalPayments - Optional. Additional payments to include in the transaction
 * @returns {Promise<DeployBsv21TokenResult>} Transaction to deploy BSV 2.1 token
 */
export declare const deployBsv21Token: (config: DeployBsv21TokenConfig) => Promise<DeployBsv21TokenResult>;
export {};
