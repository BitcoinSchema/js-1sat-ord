# Changelog

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
