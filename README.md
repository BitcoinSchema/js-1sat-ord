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
import { createOrdinals, sendOrdinals, sendUtxos } from 'js-1sat-ord'
```

### Example

Prepare some utxos to use

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

For other file types, you can still use raw bytes in base64:

```ts
// any file type (e.g., image/png, model/gltf-binary, etc.)
const inscription = {
  dataB64: "b64 string...",
  contentType: "image/png"
} 
```

#### Prepare Keys

Be sure to use different keys for ordinals and normal payments. If wallets don't know your outputs contain ordinals, they will be treated like normal utxos and potentially merged with other Satoshis. We can use the @bsv/sdk to get a PrivateKey from a WIF string:

```ts
const paymentPk = PrivateKey.fromWif(paymentWif);
```

#### Prepare destinations

Lets take a look at the destination type:

```ts
export type Destination = {
	address: string;
	inscription?: Inscription;
};

```

Destinations define the address that will recieve an inscription, and the inscription itself.

```ts
const destinations = [
  {
    address: ordinalDestinationAddress,
    inscription: { dataB64: encodedFileData, contentType: "model/gltf-binary" }
  }
];
```

### Create Ordinals

The `createOrdinals` function creates a transaction with inscription outputs. The number of utxos supplied does not need to relate to the number of destinations (you can create multiple inscriptions at once).

```ts
const tx = await createOrdinals(
  [utxo],
  destinations,
  paymentPk,
  changeAddress,
  satPerByteFee,
  metaData,
  signer,
  additionalPayments
);
```

> **Note:** It is recommended to limit the number of inscriptions you make in a single transaction, as this initial inscription will become the "origin" of this ordinal, and in some cases, this can impact the performance depending on the wallet software.

### Send Ordinals

Sends ordinals to the given destinations. The number of destinations must match number of ordinals being sent.

```ts
const tx = await sendOrdinals(
  paymentUtxos,
  ordinals,
  paymentPk,
  ordPk,
  destinations,
  changeAddress,
  satPerByteFee,
  metaData,
  additionalPayments
);
```

> **Warning:** This is not for BSV20/BSV21 tokens or other "sub-protocols" of 1Sat Ordinals that depend on a specific inscription structure. To transfering a fungible token, use the transferOrdToken function instead. Using this function to send fungible tokens will burn them!

### Deploy a BSV21 Token

First, prepare an icon by making an ordinal inscription for the icon image. It should be a square image with a standard image mime type like image/png. It should be optimized for web display (low file size). The recommended size is 400x400px. Outpoint format must be "txid_vout".

```ts
const tx = await deployBsv21(
  "MYTICKER",
  "<icon_outpoint>",
  utxos,
  initialDistribution,
  paymentPk,
  destinationAddress
)
```

You can also create the icon in the same transaction. To do this, provide an IconInscription for the icon instead of an outpoint.

```ts
const tx = await deployBsv21(
  "MYTICKER",
  iconInscription,
  utxos,
  initialDistribution,
  paymentPk,
  destinationAddress
)
```

### Transfer BSV21 Tokens

```ts
const tx = await transferOrdToken(
  TokenType.BSV21,
  tokenID,
  utxos,
  inputTokens,
  distributions,
  paymentPk,
  ordPk
);
```

### Send Utxos

Sends utxos to the given destination. This creates a typical P2PKH funds transfer without Ordinals.

```ts
const tx = await sendUtxos(
  utxos,
  paymentPk,
  destinationAddress,
  amount,
  satPerByteFee
);
```

#### Using with Bundlers

Since this package depends on `@bsv/sdk` there should be no issue with bundlers.

---