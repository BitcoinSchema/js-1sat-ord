import { OrdLockV2 } from "@1sat/templates";
import type { PrivateKey, Script } from "@bsv/sdk";
import OrdLock from "../templates/ordLock";
import { scriptFromB64 } from "./utxo";

type Unlocker = ReturnType<typeof OrdLockV2.cancelListing>;

/**
 * Returns the unlocking template for cancelling a listing. OrdLock v2 listings
 * (detected from the locking script) use the v2 cancel branch; anything else is
 * treated as a legacy OrdLock v1 listing.
 */
export const cancelListingUnlocker = (
	key: PrivateKey,
	satoshis: number,
	lockingScript: Script,
): Unlocker => {
	const v2 = OrdLockV2.decode(lockingScript);
	if (v2) {
		const address = key.toAddress().toString();
		if (v2.seller !== address) {
			throw new Error(
				`OrdLock v2 listing can only be cancelled by ${v2.seller}, key provided is for ${address}`,
			);
		}
		return OrdLockV2.cancelListing(key, "all", true, satoshis, lockingScript);
	}
	return new OrdLock().cancelListing(key, "all", true, satoshis, lockingScript);
};

/** Decodes a base64 listing script and reports whether it is an OrdLock v2 listing. */
export const isOrdLockV2Listing = (scriptB64: string): boolean =>
	OrdLockV2.decode(scriptFromB64(scriptB64)) !== null;
