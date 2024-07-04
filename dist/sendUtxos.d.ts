import { type PrivateKey, Transaction } from "@bsv/sdk";
import type { Utxo } from "./types";
export declare const sendUtxos: (utxos: Utxo[], paymentPk: PrivateKey, destinationAddress: string, amount: number, satsPerKb?: number) => Promise<Transaction>;
