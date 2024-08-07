import { Transaction } from "@bsv/sdk";
import { type CreateOrdListingsConfig, type CreateOrdTokenListingsConfig, type TokenUtxo, type Utxo } from "./types";
export declare const createOrdListings: (config: CreateOrdListingsConfig) => Promise<{
    tx: Transaction;
    spentOutpoints: string[];
    payChange: Utxo | undefined;
}>;
export declare const createOrdTokenListings: (config: CreateOrdTokenListingsConfig) => Promise<{
    tx: Transaction;
    spentOutpoints: string[];
    payChange: Utxo | undefined;
    tokenChange: TokenUtxo | undefined;
}>;
