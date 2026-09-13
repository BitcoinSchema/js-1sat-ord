---
description: js-1sat-ord
---

# js-1sat-ord (legacy)

Use **[1Sat SDK](https://github.com/b-open-io/1sat-sdk)** for new 1Sat development. This library is maintained for existing key-based integrations; the documentation below covers that API.

The replacement is a set of packages, not a drop-in API replacement:

| Need | Replacement |
| --- | --- |
| Wallet actions and transaction workflows | [`@1sat/actions`](https://github.com/b-open-io/1sat-sdk/tree/master/packages/actions) |
| Script templates | [`@1sat/templates`](https://github.com/b-open-io/1sat-sdk/tree/master/packages/templates) |
| Indexer/API access | [`@1sat/client`](https://github.com/b-open-io/1sat-sdk/tree/master/packages/client) |
| Shared types | [`@1sat/types`](https://github.com/b-open-io/1sat-sdk/tree/master/packages/types) |

See the [1Sat SDK setup and package guide](https://github.com/b-open-io/1sat-sdk#readme) before migrating. New contract support belongs in that SDK.

Marketplace listings use the **OrdLock v2** contract (from `@1sat/templates`). `createOrdListings` / `createOrdTokenListings` build v2 listings; `purchaseOrdListing` / `purchaseOrdTokenListing` and `cancelOrdListings` / `cancelOrdTokenListings` handle both v2 and legacy v1 listings, detected from the listing script. Creating new v1 listings is deprecated (`OrdLock.lock` throws).

## Legacy documentation


A Javascript library for creating and managing 1Sat Ordinal inscriptions and transactions. Uses `@bsv/sdk` under the hood.

It also includes the Ordinal Lock marketplace functions (create, purchase, and cancel listings).

It also privides helpers for fetching utxos for payments, nfts, and tokens.

### Install

Install the library, and it's peer dependency. We recommend using Bun for the best performance, but you can also use Yarn or npm:

```bash
# Using Bun (recommended)
bun add js-1sat-ord @bsv/sdk

# Using Yarn
yarn add js-1sat-ord @bsv/sdk

# Using npm
npm i js-1sat-ord @bsv/sdk
```

### Usage

```ts
import { createOrdinals, sendOrdinals, sendUtxos, deployBsv21Token, transferOrdToken } from 'js-1sat-ord'
```

### Example

Prepare some utxos to use in the following format. Be sure to use base64 encoded scripts. We use this encoding because it makes large scripts smaller in size.

```ts
import type { Utxo } from "js-1sat-ord";

const utxo: Utxo = {
  satoshis: 269114,
  txid: "61fd6e240610a9e9e071c34fc87569ef871760ea1492fe1225d668de4d76407e",
  script: "<base64 encoded script>",
  vout: 1,
};
```

 You can use the helper `fetchPayUtxos(address)` to fetch unspent transaction outputs from the public 1Sat API and create the scripts with the correct encoding (base64). This should be a BSV address, not your ordinals address. Note: By default the script encoding will be base64, but you can provide a 2nd parameter and specify hex or asm encoding for the script property.

 Note: `Utxo` and `NftUtxo` and `TokenUtxo` have an optional `pk` field for specifying a Private Key for unlocking this utxo. This is helpful when multiple keys own the inputs and you need to spend them in a single transaction.

 ```ts
 import { fetchPayUtxos } from "js-1sat-ord";

 const utxos = await fetchPayUtxos(payAddress)
 ```

For NFTUtxos:

```ts
import { fetchNftUtxos } from "js-1sat-ord"

// collectionId is optional
const collectionId = "1611d956f397caa80b56bc148b4bce87b54f39b234aeca4668b4d5a7785eb9fa_0"
const nftUtxos = await fetchNftUtxos(ordAddress, collectionId)
```

For Token Utxos:

```ts
import { fetchTokenUtxos, type TokenType } from "js-1sat-ord"

const protocol = TokenType.BSV21;
const tokenId = "e6d40ba206340aa94ed40fe1a8adcd722c08c9438b2c1dd16b4527d561e848a2_0";
const tokenUtxos = await fetchTokenUtxos(protocol, tokenId, ordAddress);
```

#### Prepare Inscription

For a markdown inscription, you can create a string and convert it to base64:

```ts
import type { Inscription } from "js-1sat-ord";


// Create a markdown string
const markdownContent = "# Hello World!\n\nThis is a 1Sat Ordinal inscription.";

// Convert to base64
const encodedFileData = Buffer.from(markdownContent).toString('base64');

// Prepare the inscription object
const inscription: Inscription = {
  dataB64: encodedFileData,
  contentType: "text/markdown"
};
```

#### Prepare Keys

Be sure to use different keys for ordinals and normal payments:

```ts
import { PrivateKey } from "js-1sat-ord";

const paymentPk = PrivateKey.fromWif(paymentWif);
const ordPk = PrivateKey.fromWif(ordWif);
```

### Create Ordinals

The `createOrdinals` function creates a transaction with inscription outputs:

```ts
import type { CreateOrdinalsConfig } from "js-1sat-ord";

const config: CreateOrdinalsConfig = {
  utxos: [utxo],
  destinations: [{
    address: ordinalDestinationAddress,
    inscription: { dataB64: encodedFileData, contentType: "text/markdown" }
  }],
  paymentPk: paymentPk
};

const result = await createOrdinals(config);
```

### Send Ordinals

Sends ordinals to the given destinations:

```ts
import type { SendOrdinalsConfig } from "js-1sat-ord";

const config: SendOrdinalsConfig = {
  paymentUtxos: [paymentUtxo],
  ordinals: [ordinalUtxo],
  paymentPk: paymentPk,
  ordPk: ordPk,
  destinations: [{
    address: destinationAddress,
    inscription: { dataB64: encodedFileData, contentType: "text/markdown" }
  }]
};

const result = await sendOrdinals(config);
```

### Deploy a BSV21 Token

```ts
import type { DeployBsv21TokenConfig } from "js-1sat-ord";

const config: DeployBsv21TokenConfig = {
  symbol: "MYTICKER",
  icon: "<icon_outpoint>",
  utxos: [utxo],
  initialDistribution: { address: destinationAddress, tokens: 10 },
  paymentPk: paymentPk,
  destinationAddress: destinationAddress
};

const result = await deployBsv21Token(config);
```

### Transfer BSV21 Tokens

```ts
import type { TransferBsv21TokenConfig } from "js-1sat-ord";

const config: TransferBsv21TokenConfig = {
  protocol: TokenType.BSV21,
  tokenID: tokenID,
  utxos: [utxo],
  inputTokens: [tokenUtxo],
  distributions: [{ address: destinationAddress, tokens: 0.1 }],
  paymentPk: paymentPk,
  ordPk: ordPk
};

const result = await transferOrdToken(config);
```

Note: To burn tokens you can set the optional `burn` parameter to `true`
Note: You can use the optional `splitConfig` parameter to configure how and when to split token change outputs, and whether change outputs should include metadata.
Note: You can use the optional `tokenInputMode` parameter to configure whether `all` tokens are consumed, or only what's `needed`. Default is `needed`.

### Send Utxos

Sends utxos to the given destination:

```ts
import type { SendUtxosConfig } from "js-1sat-ord";

const config: SendUtxosConfig = {
  utxos: [utxo],
  paymentPk: paymentPk,
  payments: [{ to: destinationAddress, amount: 1000 }]
};

const { tx } = await sendUtxos(config);
```

### Create Ordinal Listings 
Creates a listing using the OrdLock v2 contract. Can be purchased by anyone by paying the listed price to the provided address; the ordinal returns to `ordAddress` on cancel. Token listings (`createOrdTokenListings`) carry their transfer inscription ahead of the contract.

```ts
const listings = [{
  payAddress: addressToReceivePayment;
  price: 100000; // price in satoshis
  listingUtxo,
  ordAddress: returnAddressForCancel;
}]

const config: CreateOrdListingsConfig = {
  utxos: [utxo],
  listings,
  paymentPk,
  ordPk,
}

const { tx } = await createOrdListings(config);
```

### Purchase Ordinal Listing

```ts
const config: PurchaseOrdListingConfig = {
  utxos: [utxo, feeUtxo],
  paymentPk,
  listing: { listingUtxo },
  ordAddress,
};

const { tx, payChange, cushion } = await purchaseOrdListing(config);
```

The v2 contract binds the seller's payout to the output at the listing's own input index, and the purchased ordinal follows first-sat ordering into a 1-sat receive output. The purchase is laid out as:

```
inputs:  [front funding…] [listing] [fee funding…]
outputs: [cushion / 0-sat fillers…] [payout] [receive] [additional payments…] [royalties…] [change]
```

Front funding is taken from the largest `utxos` until the price is covered; its remainder returns to the change address as the `cushion` output (index 0). Because that remainder is fixed by the contract layout, **the fee must come from a separate utxo**: pass at least one utxo beyond those covering the price (split one with `sendUtxos` if needed). `payChange` is the ordinary change output; `cushion` is set when the front funding exceeded the price. Legacy v1 listings still need `listing.payout` (the serialized payout from the indexer); v2 listings read it from the script.

### Cancel Ordinal Listings
Spends the ordinal lock without payment, returning the ordinal to the signing key's address. `ordPk` (or `listingUtxo.pk`) must be the key that created the listing; each generation of the contract (v2 or legacy v1) is unlocked with its own cancel branch.

```ts
const config: CancelOrdListingsConfig = { utxos, listingUtxos, ordPk, paymentPk };
const { tx } = await cancelOrdListings(config);
```

### Additional Configuration Options

Each function accepts additional configuration options not shown in the examples above. These may include:

- `changeAddress`: Address to send change to (if not provided, defaults to the payment key's address)
- `satsPerKb`: Satoshis per kilobyte for fee calculation
- `metaData`: MAP (Magic Attribute Protocol) metadata to include in inscriptions
- `signer`: LocalSigner or RemoteSigner object for adding Sigma protocol signatures to transactions (provides replay protection)
- `additionalPayments`: Additional payments to include in the transaction

#### Using Sigma Protocol Signatures

Several functions support optional Sigma protocol signatures for replay protection:

```ts
import { PrivateKey } from "@bsv/sdk";

const signerKey = PrivateKey.fromRandom();
const signer = { idKey: signerKey };

// Use with any supported function
const config = {
  // ... other config options
  signer: signer
};
```

Supported functions: `createOrdinals`, `sendOrdinals`, `transferOrdToken`, `deployBsv21Token`, `sendUtxos`, `createOrdListings`, `createOrdTokenListings`

Refer to the function documentation for a complete list of configuration options for each function.

### Broadcasting

```ts
import { oneSatBroadcaster } from "js-1sat-ord"

// ...

const { status, txid, message  } = await tx.broadcast(oneSatBroadcaster())
```

#### Using with Bundlers

Since this package depends on `@bsv/sdk` there should be no issue with bundlers.

## Resources
There is a public 1Sat API which is documented here:

[https://ordinals.gorillapool.io/api/docs](https://ordinals.gorillapool.io/api/docs)

---