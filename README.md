---
description: js-1sat-ord
---

# 1Sat Ordinals - JS Library

A Javascript library for creating and managing 1Sat Ordinal inscriptions and transactions. Uses `@bsv/sdk` under the hood.

### Install

We recommend using Bun for the best performance, but you can also use Yarn or npm:

```bash
# Using Bun (recommended)
bun add js-1sat-ord

# Using Yarn
yarn add js-1sat-ord

# Using npm
npm install js-1sat-ord
```

### Usage

```ts
import { createOrdinals, sendOrdinals, sendUtxos, deployBsv21Token, transferOrdToken } from 'js-1sat-ord'
```

### Example

Prepare some utxos to use. You can use the helper `fetchPayUtxos(address)` to fetch from the public 1Sat API, or use an API of your choice.

```ts
const utxo: Utxo = {
  satoshis: 269114,
  txid: "61fd6e240610a9e9e071c34fc87569ef871760ea1492fe1225d668de4d76407e",
  script: "<base64 encoded script>",
  vout: 1,
};
```

#### Prepare Inscription

For a markdown inscription, you can create a string and convert it to base64:

```ts
// Create a markdown string
const markdownContent = "# Hello World!\n\nThis is a 1Sat Ordinal inscription.";

// Convert to base64
const encodedFileData = Buffer.from(markdownContent).toString('base64');

// Prepare the inscription object
const inscription = {
  dataB64: encodedFileData,
  contentType: "text/markdown"
};
```

#### Prepare Keys

Be sure to use different keys for ordinals and normal payments:

```ts
const paymentPk = PrivateKey.fromWif(paymentWif);
const ordPk = PrivateKey.fromWif(ordWif);
```

### Create Ordinals

The `createOrdinals` function creates a transaction with inscription outputs:

```ts
const config = {
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
const config = {
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
const config = {
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
const config = {
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

### Send Utxos

Sends utxos to the given destination:

```ts
const config = {
  utxos: [utxo],
  paymentPk: paymentPk,
  payments: [{ to: destinationAddress, amount: 1000 }]
};

const tx = await sendUtxos(config);
```

### Additional Configuration Options

Each function accepts additional configuration options not shown in the examples above. These include:

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