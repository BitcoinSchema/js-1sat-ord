import { Transaction } from "@bsv/sdk";
import { type PurchaseOrdListingConfig, type PurchaseOrdTokenListingConfig, type Utxo } from "./types";
export declare const purchaseOrdListing: (config: PurchaseOrdListingConfig) => Promise<{
    tx: Transaction;
    spentOutpoints: string[];
    payChange: Utxo | undefined;
}>;
export declare const purchaseOrdTokenListing: (config: PurchaseOrdTokenListingConfig) => Promise<{
    tx: Transaction;
    spentOutpoints: string[];
    payChange: Utxo | undefined;
}>;
