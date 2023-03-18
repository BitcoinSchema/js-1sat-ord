## js-1sat-ord

A library for creating 1Sat Ordinal inscriptions and transactions. Uses bsv-wasm under the hood.

## Install

```bash
yarn add js-1sat-ord
```

## Usage

```ts
import { createOrdinal, sendOrdinal } from 'js-1sat-ord'
```

## Example

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

### Prepare Inscription

Format raw bytes in b64

```ts
const frostShard = "b64 string...";
```

### Prepare Keys

Be sure to use different keys for ordinals and normal payments. If wallets don't know your outputs contain ordinals, they will be treated like normal utxos and potentially merged with other Satoshis.

```ts
const paymentPk = PrivateKey.from_wif(paymentWif);
const ordPk = PrivateKey.from_wif(ordinalWif2);
```

## Create an inscription

The `createOrdinal` function takes a utxo and inscription data.

```ts
// inscription
const inscription =  { data: fireShard,  contentType: "model/gltf-binary"}

// returns Promise<Transaction>
const tx = createOrdinal(utxo, ordinalDestinationAddress, paymentPk, changeAddress, inscription);
```

## Transfer

Sends the ordinal to the destination address.

```ts
const tx = sendOrdinal(
  utxo,
  ordinal,
  paymentPk,
  changeAddress,
  ordPk,
  ordDestinationAddress
);
```

## Geotagging

You can optyionally pass `appName` and `geohash` to tag an inscription at a specific location.

```ts
// inscription
const inscription =  { data: fireShard,  contentType: "model/gltf-binary",  geohash: "dree547h7", appName: "ord-demo" }

const tx = createOrdinal(utxo, ordinalDestinationAddress, paymentPk, changeAddress, inscription);
```

`appName` - is publicly shown in the tx. Should be the app or platform name making the inscription.

`geohash` - is a standard geohash string referring to a location.

## Re-Inscription

You can technically reinscribe on the same Satoshi. Its up to the apps / indexers to determine what this means unless a standard approach emerges.

```ts
// optional reinscription
const reinscription =  { data: frostShard,  contentType: "model/gltf-binary" }

const tx = sendOrdinal(
  utxo,
  ordinal,
  paymentPk,
  changeAddress,
  ordPk,
  ordDestinationAddress,
  reinscription
);
```
