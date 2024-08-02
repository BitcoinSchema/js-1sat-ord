---
description: js-1sat-ord
---

# 1Sat Ordinals - JS Library

A Javascript library for creating and managing 1Sat Ordinal inscriptions and transactions. Uses `@bsv/sdk` under the hood.

It provides functions for listing, cancelling and purchasing Ordinal Lock transactions.

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
  initialDistribution: { address: destinationAddress, amt: "1000000000" },
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
  distributions: [{ address: destinationAddress, amt: "1000" }],
  paymentPk: paymentPk,
  ordPk: ordPk
};

const result = await transferOrdToken(config);
```

Note: To burn tokens you can set the optional `burn`  parameter to `true`
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
Creates a listing using an "Ordinal Lock" script. Can be purchased by anyone by sending a specific amount to the provided address.

```ts
const listings = [{
  payAddress: addressToReceivePayment;
  price: 100000; // price in satoshis
  ordAddress: returnAddressForCancel;
}]

const config: CreateOrdListingsConfig = {
  utxos: [utxo],
  listings,
  paymentPk,
}

const { tx } = await createOrdListings(config);
```

### Purchase Ordinal Listing

```ts
const config: PurchaseOrdListingConfig ={
  utxos: [utxo], 
  paymentPk, 
  listingUtxo, 
  ordAddress,
};

const { tx } = await purchaseOrdListing(config);
```

### Cancel Ordinal Listings
Spends the ordinal lock without payment, returning the ordinal to the address specified in the listing contract.

```ts
const config: CancelOrdListingsConfig = { utxos, listingUtxos, ordPk, paymentPk };
const { tx } = await cancelOrdListings(config);
```

### Additional Configuration Options

Each function accepts additional configuration options not shown in the examples above. These may include:

- `changeAddress`: Address to send change to (if not provided, defaults to the payment key's address)
- `satsPerKb`: Satoshis per kilobyte for fee calculation
- `metaData`: MAP (Magic Attribute Protocol) metadata to include in inscriptions
- `signer`: Custom signer object for transaction signing
- `additionalPayments`: Additional payments to include in the transaction

Refer to the function documentation for a complete list of configuration options for each function.

#### Using with Bundlers

Since this package depends on `@bsv/sdk` there should be no issue with bundlers.

## Resources
There is a public 1Sat API which is documented here:

[https://ordinals.gorillapool.io/api/docs](https://ordinals.gorillapool.io/api/docs)

---