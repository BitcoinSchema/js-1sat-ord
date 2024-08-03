import { Transaction } from "@bsv/sdk";
import { type CancelOrdListingsConfig, type CancelOrdTokenListingsConfig, type Utxo } from "./types";
export declare const cancelOrdListings: (config: CancelOrdListingsConfig) => Promise<{
    tx: Transaction;
    spentOutpoints: string[];
    payChange: Utxo | undefined;
}>;
export declare const cancelOrdTokenListings: (config: CancelOrdTokenListingsConfig) => Promise<{
    tx: Transaction;
    spentOutpoints: string[];
    payChange: Utxo | undefined;
}>;
