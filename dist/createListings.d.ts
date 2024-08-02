import { Transaction } from "@bsv/sdk";
import type { CraeteOrdTokenListingsConfig, CreateOrdListingsConfig, Utxo } from "./types";
export declare const createOrdListings: (config: CreateOrdListingsConfig) => Promise<{
    tx: Transaction;
    spentOutpoints: string[];
    payChange: Utxo | undefined;
}>;
export declare const createOrdTokenListings: (config: CraeteOrdTokenListingsConfig) => Promise<void>;
