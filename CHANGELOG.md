# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.86] - 2025-11-18

### Changed
- Update bundled @bsv/templates to latest version
- Update @bsv/sdk peer dependency to 1.9.9
- Update dev dependencies (@types/bun 1.3.2, rimraf 6.1.0)

## [0.1.85] - 2025-11-18

### Changed
- Bundle @bsv/templates directly into dist files instead of treating as external dependency
- Remove @bsv/templates from package dependencies (now bundled)
- Configure microbundle to only externalize @bsv/sdk

### Fixed
- Fix Bun installation errors with @bsv/templates tarball dependency

## [0.1.84] - 2025-11-17

### Fixed
- Fix bundled @bsv/templates dependency path for npm consumers (changed to relative path)
- Fix BigInt transpilation bug in MAX_TOKEN_SUPPLY constant

## [0.1.83] - 2025-11-17

### Changed
- Increased default fee rate from 10 sat/kb to 100 sat/kb to better reflect current network conditions
