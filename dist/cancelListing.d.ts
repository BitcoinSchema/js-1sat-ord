import { Transaction } from "@bsv/sdk";
import type { CancelOrdListingsConfig, Utxo } from "./types";
export declare const cancelOrdListings: (config: CancelOrdListingsConfig) => Promise<{
    tx: Transaction;
    spentOutpoints: string[];
    payChange: Utxo | undefined;
}>;
