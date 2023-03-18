# Reinscription

You can technically re-inscribe on the same Satoshi. Its up to the apps / indexers to determine what this means unless a standard approach emerges.

```ts
// optional reinscription
const reinscription =  { dataB64: frostShard,  contentType: "model/gltf-binary" }

const tx = sendOrdinal(
  utxo,
  ordinal,
  paymentPk,
  changeAddress,
  satPerByteFee,
  ordPk,
  ordDestinationAddress,
  reinscription
);
```
