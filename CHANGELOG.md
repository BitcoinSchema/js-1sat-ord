# Changelog

## [0.1.89] - 2025-12-11

### Added
- `signInputs` option to all transaction-building functions (`createOrdinals`, `sendOrdinals`, `sendUtxos`, `deployBsv21Token`, `transferOrdTokens`, `createOrdListings`, `createOrdTokenListings`)
  - When `signInputs: false`, inputs are added with fee estimation support but without signing
  - Enables server-side Sigma signing while deferring input signing to external wallets
  - Defaults to `true` for backward compatibility

### Changed
- Updated `@bsv/templates` to 1.1.0 (bundled from unreleased ts-templates)
- `inputFromB64Utxo` now accepts optional `unlockScriptTemplate` parameter
