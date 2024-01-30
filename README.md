---
description: js-1sat-ord
---

# 1Sat Ordinals - JS Library

A Javascript library for creating 1Sat Ordinal inscriptions and transactions. Uses `bsv-wasm` under the hood.

### Install

```bash
yarn add js-1sat-ord
```

### Usage

```ts
import { createOrdinal, sendOrdinal, sendUtxos } from 'js-1sat-ord'
```

### Example

Prepare some utxos to use

```ts
const ordinal: Utxo = {
  satoshis: 1,
  txid: "61fd6e240610a9e9e071c34fc87569ef871760ea1492fe1225d668de4d76407e",
  script:
    "OP_DUP OP_HASH160 b87db78cba867b9f5def9f48d00ec732493ee543 OP_EQUALVERIFY OP_CHECKSIG",
  vout: 0,
};

const utxo: Utxo = {
  satoshis: 269114,
  txid: "61fd6e240610a9e9e071c34fc87569ef871760ea1492fe1225d668de4d76407e",
  script:
    "OP_DUP OP_HASH160 df936f6867bf13de0feef81b3fd14804c35e8cc6 OP_EQUALVERIFY OP_CHECKSIG",
  vout: 1,
};
```

#### Prepare Inscription

Format raw bytes in b64

```ts
const frostShard = "b64 string...";
```

#### Prepare Keys

Be sure to use different keys for ordinals and normal payments. If wallets don't know your outputs contain ordinals, they will be treated like normal utxos and potentially merged with other Satoshis.

```ts
const paymentPk = PrivateKey.from_wif(paymentWif);
const ordinalDestinationAddress  = "1N8GgJVvwkiQjjN9Fws9t5ax1PLeHrn2bh";
```

### Create an inscription

The `createOrdinal` function takes a utxo and inscription data.

```ts
// inscription
const inscription =  { dataB64: fireShard,  contentType: "model/gltf-binary"}

// returns Promise<Transaction>
const tx = createOrdinal(utxo, ordinalDestinationAddress, paymentPk, changeAddress, satPerByteFee, inscription);
```

### Transfer

Sends the ordinal to the destination address.

```ts
const tx = sendOrdinal(
  utxo,
  ordinal,
  paymentPk,
  changeAddress,
  satPerByteFee,
  ordPk,
  ordDestinationAddress
);
```

### Send Utxos

Sends all utxos for the given address to the destination address

```ts
const tx = sendOrdinal(
  utxos,
  paymentPk,
  address,
  feeSats
);
```

#### Using with Bundlers

Since this package depends on `bsv-wasm` it will throw errors when used in a frontend project. One workaround for this is to tell your bundler to use `bsv-wasm` instead of `bsv-wasm`. There's a webpack example:

Install module replacer
```
npm i replace-module-webpack-plugin
```

Modify the plugins field of your webpack config:

```js
  config.plugins = [
    ...config.plugins,
    new WebpackPluginReplaceNpm({
      rules: [
        {
          originModule: "bsv-wasm",
          replaceModule: "bsv-wasm",
        },
      ],
    }),
  ];
```

if you only want to make the replacement for this package

```js
  {
    originModule: "bsv-wasm",
    replaceModule: "bsv-wasm",
    context: /node_modules\/js-1sat-ord/,
  },  
```