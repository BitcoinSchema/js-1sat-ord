import type { Transaction } from "@bsv/sdk";
import { ORDLOCK_CREATE_DISABLED } from "./templates/ordLock";
import type {
  CreateOrdListingsConfig,
  CreateOrdTokenListingsConfig,
  TokenChangeResult,
  Utxo,
} from "./types";

export const createOrdListings = async (
  _config: CreateOrdListingsConfig,
): Promise<{
  tx: Transaction;
  spentOutpoints: string[];
  payChange: Utxo | undefined;
}> => {
  // ORDLOCK_LISTING_DISABLED — restore when the replacement listing contract ships.
  throw new Error(ORDLOCK_CREATE_DISABLED);
};

export const createOrdTokenListings = async (
  _config: CreateOrdTokenListingsConfig,
): Promise<TokenChangeResult> => {
  // ORDLOCK_LISTING_DISABLED — restore when the replacement listing contract ships.
  throw new Error(ORDLOCK_CREATE_DISABLED);
};
