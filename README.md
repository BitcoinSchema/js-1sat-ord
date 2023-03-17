## js-1sat-ord

## Getting started
 - Rename `sample.env` to `.env`
 - Generate your own wif keys and replace them in `.env`
 - run `yarn` then `yarn start`

 You should see a raw tx hex output in the console.

 ## TODO

 - [ ] fetch utxos for address
 - [ ] document createOrdinal
 - [ ] documentsendOrdinal

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
const frostShard =
  "Z2xURgIAAADUfQoAbAcAAEpTT057ImFzc2V0Ijp7ImdlbmVyYXRvciI6Ik1pY3Jvc29mdCBHTFRGIEV4cG9ydGVyIDIuOC4zLjQwIiwidmVyc2lvbiI6IjIuMCJ9LCJhY2Nlc3NvcnMiOlt7ImJ1ZmZlclZpZXciOjAsImNvbXBvbmVudFR5cGUiOjUxMjUsImNvdW50IjozNDgsInR5cGUiOiJTQ0FMQVIifSx7ImJ1ZmZlclZpZXciOjEsImNvbXBvbmVudFR5cGUiOjUxMjYsImNvdW50IjozNDgsInR5cGUiOiJWRUMzIiwibWF4IjpbMC4zNjIyNjQ5OTA4MDY1Nzk2LDEuMTU1ODU4OTkzNTMwMjczNSwwLjQwOTIwNjAwMjk1MDY2ODM2XSwibWluIjpbLTAuNDUyMjI4OTkzMTc3NDEzOTYsLTAuNjI1MDc5OTg5NDMzMjg4NiwtMC40MDY1NDk5OTAxNzcxNTQ1Nl19LHsiYnVmZmVyVmlldyI6MiwiY29tcG9uZW50VHlwZSI6NTEyNiwiY291bnQiOjM0OCwidHlwZSI6IlZFQzMifSx7ImJ1ZmZlclZpZXciOjMsImNvbXBvbmVudFR5cGUiOjUxMjYsImNvdW50IjozNDgsInR5cGUiOiJWRUM0In0seyJidWZmZXJWaWV3Ijo0LCJjb21wb25lbnRUeXBlIjo1MTI2LCJjb3VudCI6MzQ4LCJ0eXBlIjoiVkVDMiJ9XSwiYnVmZmVyVmlld3MiOlt7ImJ1ZmZlciI6MCwiYnl0ZU9mZnNldCI6MCwiYnl0ZUxlbmd0aCI6MTM5MiwidGFyZ2V0IjozNDk2M30seyJidWZmZXIiOjAsImJ5dGVPZmZzZXQiOjEzOTIsImJ5dGVMZW5ndGgiOjQxNzYsInRhcmdldCI6MzQ5NjJ9LHsiYnVmZmVyIjowLCJieXRlT2Zmc2V0Ijo1NTY4LCJieXRlTGVuZ3RoIjo0MTc2LCJ0YXJnZXQiOjM0OTYyfSx7ImJ1ZmZlciI6MCwiYnl0ZU9mZnNldCI6OTc0NCwiYnl0ZUxlbmd0aCI6NTU2OCwidGFyZ2V0IjozNDk2Mn0seyJidWZmZXIiOjAsImJ5dGVPZmZzZXQiOjE1MzEyLCJieXRlTGVuZ3RoIjoyNzg0LCJ0YXJnZXQiOjM0OTYyfSx7ImJ1ZmZlciI6MCwiYnl0ZU9mZnNldCI6MTgwOTYsImJ5dGVMZW5ndGgiOjY2NzU0NX1dLCJidWZmZXJzIjpbeyJieXRlTGVuZ3RoIjo2ODU2NDF9XSwiaW1hZ2VzIjpbeyJidWZmZXJWaWV3Ijo1LCJtaW1lVHlwZSI6ImltYWdlL3BuZyJ9XSwibWF0ZXJpYWxzIjpbeyJwYnJNZXRhbGxpY1JvdWdobmVzcyI6eyJiYXNlQ29sb3JUZXh0dXJlIjp7ImluZGV4IjowfSwibWV0YWxsaWNGYWN0b3IiOjAuMCwicm91Z2huZXNzRmFjdG9yIjowLjEwOTgwMzkyOTkyNDk2NDl9LCJkb3VibGVTaWRlZCI6dHJ1ZX1dLCJtZXNoZXMiOlt7InByaW1pdGl2ZXMiOlt7ImF0dHJpYnV0ZXMiOnsiVEFOR0VOVCI6MywiTk9STUFMIjoyLCJQT1NJVElPTiI6MSwiVEVYQ09PUkRfMCI6NH0sImluZGljZXMiOjAsIm1hdGVyaWFsIjowfV19XSwibm9kZXMiOlt7ImNoaWxkcmVuIjpbMV0sInJvdGF0aW9uIjpbLTAuNzA3MTA2NzA5NDgwMjg1NiwwLjAsLTAuMCwwLjcwNzEwNjgyODY4OTU3NTJdLCJzY2FsZSI6WzEuMCwwLjk5OTk5OTk0MDM5NTM1NTIsMC45OTk5OTk5NDAzOTUzNTUyXSwibmFtZSI6IlJvb3ROb2RlIChnbHRmIG9yaWVudGF0aW9uIG1hdHJpeCkifSx7ImNoaWxkcmVuIjpbMl0sIm5hbWUiOiJSb290Tm9kZSAobW9kZWwgY29ycmVjdGlvbiBtYXRyaXgpIn0seyJjaGlsZHJlbiI6WzNdLCJyb3RhdGlvbiI6WzAuNzA3MTA2NzY5MDg0OTMwNCwwLjAsMC4wLDAuNzA3MTA2NzY5MDg0OTMwNF0sIm5hbWUiOiI5MzcwMjFkNDkyYjM0ZjBlOWM4NDU3YjBmMTNhYTBmZS5mYngifSx7ImNoaWxkcmVuIjpbNF0sIm5hbWUiOiJSb290Tm9kZSJ9LHsiY2hpbGRyZW4iOls1XSwibmFtZSI6ImNyeXN0YWxMb3c6TWVzaCJ9LHsibWVzaCI6MCwibmFtZSI6ImNyeXN0YWxMb3c6TWVzaF9sYW1iZXJ0NF8wIn1dLCJzYW1wbGVycyI6W3sibWFnRmlsdGVyIjo5NzI5LCJtaW5GaWx0ZXIiOjk5ODd9XSwic2NlbmVzIjpbeyJub2RlcyI6WzBdfV0sInRleHR1cmVzIjpbeyJzYW1wbGVyIjowLCJzb3VyY2UiOjB9XSwic2NlbmUiOjB9THYKAEJJTgAAAAAAAQAAAAIAAAADAAAABAAAAAUAAAAGAAAABwAAAAgAAAAJAAAACgAAAAsAAAAMAAAADQAAAA4AAAAPAAAAEAAAABEAAAASAAAAEwAAABQAAAAVAAAAFgAAABcAAAAYAAAAGQAAABoAAAAbAAAAHAAAAB0AAAAeAAAAHwAAACAAAAAhAAAAIgAAACMAAAAkAAAAJQAAACYAAAAnAAAAKAAAACkAAAAqAAAAKwAAACwAAAAtAAAALgAAAC8AAAAwAAAAMQAAADIAAAAzAAAANAAAADUAAAA2AAAANwAAADgAAAA5AAAAOgAAADsAAAA8AAAAPQAAAD4AAAA=";
```

### Prepare Keys
Use different keys for ordinals and normal payments:

```ts
const paymentPk = PrivateKey.from_wif(paymentWif);
const ordPk = PrivateKey.from_wif(ordinalWif2);
```

## createOrdinal
create an inscription
```ts
// inscription
const inscription =  { data: frostShard,  contentType: "model/gltf-binary",  geohash: "dree547h7" }

createOrdinal(utxo, inscription);
```

you can optionally reinscribe on the same Satoshi. its up to the app / indexer to determine what this means unless a standard approach emerges.

```ts
// optional reinscription
const reinscription =  { data: frostShard,  contentType: "model/gltf-binary",  geohash: "dree547h7" }

sendOrdinal(
  utxo,
  ordinal,
  paymentPk,
  ordPk,
  reinscription
);
```
