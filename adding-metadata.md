# Adding Metadata

You can optionally pass metadata. In this example we add the standard MAP keys `app` and `type` along with a geotag context with `geohash` and `context` fields to tag an inscription at a specific location.

```ts

// set fee rate
const satPerByteFee = 0.05

// inscription
const inscription =  { dataB64: fireShard,  contentType: "model/gltf-binary" }

// Define MAP keys as a JSON object
const metaData = { app: "ord-demo", type: "ord", context: "geohash", geohash: "dree547h7" }

const tx = createOrdinal(utxo, ordinalDestinationAddress, paymentPk, changeAddress, satPerByteFee, inscription, metaData);
```

`app` - is publicly shown in the tx. Should be the app or platform name making the inscription.

`context` = is a standard field making the tags apply to a particular type of identifier, in this case a `geohash`.

`geohash` - is a standard geohash string referring to a location.

both `createOrdinial` and `sendOrdinal` can optionally take metadata.

###

