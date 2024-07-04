import type { Transaction } from "@bsv/sdk";
import type { LocalSigner, RemoteSigner } from "./types";
/**
 * Signs data in the transaction with Sigma protocol
 * @param {Transaction} tx - Transaction to sign
 * @param {LocalSigner | RemoteSigner} signer - Local or remote signer (used for data signature)
 * @returns {Transaction} Transaction with signed data
 */
export declare const signData: (tx: Transaction, signer: LocalSigner | RemoteSigner) => Promise<Transaction>;
