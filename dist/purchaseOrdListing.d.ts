import { Transaction } from "@bsv/sdk";
import type { PurchaseOrdListingConfig, Utxo } from "./types";
export declare const purchaseOrdListings: (config: PurchaseOrdListingConfig) => Promise<{
    tx: Transaction;
    spentOutpoints: string[];
    payChange: Utxo | undefined;
}>;
