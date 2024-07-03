import { type Transaction, type UnlockingScript } from "@bsv/sdk";
import type { Utxo } from "../types";
export declare const fromB64Utxo: (utxo: Utxo, unlockScriptTemplate: {
    sign: (tx: Transaction, inputIndex: number) => Promise<UnlockingScript>;
    estimateLength: (tx: Transaction, inputIndex: number) => Promise<number>;
}) => import("@bsv/sdk").TransactionInput;
