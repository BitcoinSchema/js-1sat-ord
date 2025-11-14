# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.83] - Unreleased

### Changed
- Increased default fee rate from 10 sat/kb to 100 sat/kb to better reflect current network conditions

### Added
- Support for `targetVout` parameter in Signer type to specify which output receives the signature
- Automatic handling of OrdLock smart contracts in listings - signature data is added to a new OP_RETURN output when `targetVout` is not specified, preventing modification of the contract in output 0

### Fixed
- OrdLock smart contracts no longer have their locking scripts modified by Sigma signatures during listing creation
