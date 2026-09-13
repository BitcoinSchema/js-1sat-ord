# Changelog

## [0.1.93] - 2026-09-13

### Added
- Listing creation is back on the **OrdLock v2** contract: `createOrdListings` and `createOrdTokenListings` build v2 listings (`OrdLockV2` from `@1sat/templates`, re-exported here).
- `purchaseOrdListing` / `purchaseOrdTokenListing` and `cancelOrdListings` / `cancelOrdTokenListings` detect the listing generation from the script and unlock v2 or legacy v1 accordingly.
- `ChangeResult.cushion`: v2 purchases return the front-funding remainder as output 0.
- `OrdLockV2` export; `inscriptionEnvelope` helper.

### Changed
- v2 purchases are laid out as `[front funding…][listing][fee…]` → `[cushion/fillers…][payout][receive][extras…][change]`; the fee must come from a utxo beyond those covering the price.
- `ExistingListing.payout` is optional (still required for legacy v1 listings).
- `@1sat/templates` 0.0.37; `@bsv/sdk` peer `^2.6.0`.
- The legacy `OrdLock.lock` keeps throwing `ORDLOCK_CREATE_DISABLED` (v1 listing creation is deprecated).

## [0.1.92] - 2026-09-11

### Changed
- Deprecate creation of OrdLock listings while retaining cancellation and purchase APIs.
- Align supported SDK and signing-library dependencies.
- Direct new development to the maintained 1Sat SDK as this library is retired.

OrdLock is being deprecated in favor of a more advanced locking contract.

## [0.1.89] - 2025-12-11

### Added
- `signInputs` option to all transaction-building functions (`createOrdinals`, `sendOrdinals`, `sendUtxos`, `deployBsv21Token`, `transferOrdTokens`, `createOrdListings`, `createOrdTokenListings`)
  - When `signInputs: false`, inputs are added with fee estimation support but without signing
  - Enables server-side Sigma signing while deferring input signing to external wallets
  - Defaults to `true` for backward compatibility

### Changed
- Updated `@bsv/templates` to 1.1.0 (bundled from unreleased ts-templates)
- `inputFromB64Utxo` now accepts optional `unlockScriptTemplate` parameter
