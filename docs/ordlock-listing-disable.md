# Deprecate OrdLock listing creation

New listings should not use the current OrdLock template. A replacement
contract is coming. Buy and cancel of existing listings stay enabled.

When the replacement ships, restore every site marked
`ORDLOCK_LISTING_DISABLED` (grep that string) and point `lock()` /
`createOrdListings` / `createOrdTokenListings` at the new template.
