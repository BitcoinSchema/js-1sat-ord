import { Transaction } from "@bsv/sdk";
import { type CreateOrdTokenListingsConfig, type CreateOrdListingsConfig, type Utxo, type TokenUtxo } from "./types";
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
