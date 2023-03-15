import {
  PrivateKey,
  Script,
  SigHash,
  Transaction,
  TxIn,
  TxOut,
} from "bsv-wasm";
import { Buffer } from "buffer";
import * as dotenv from "dotenv";

dotenv.config();

type Utxo = {
  satoshis: number;
  txid: string;
  vout: number;
  script: string;
};

// The wif for funding the tx
const paymentWif = process.env.PAYMENT_WIF as string;
// The key to use when signing inscriptions
const signingWif = process.env.SIGNING_WIF as string;
// The key of the wallet to hold the 1sat ordinals - alice
const ordinalWif = process.env.ORDINAL_WIF as string;
// The key of the wallet to hold the 1sat ordinals - bob
const ordinalWif2 = process.env.ORDINAL_WIF2 as string;

const MAP_PREFIX = "1PuQa7K62MiKCtssSLKy1kh56WWU7MtUR5";

// Where to send the ordinal
const destinationPublicKey = PrivateKey.from_wif(ordinalWif).to_public_key();
const destination2PublicKey = PrivateKey.from_wif(ordinalWif2).to_public_key();

const changeaddr = PrivateKey.from_wif(paymentWif).to_public_key().to_address();

// TODO: Fetch utxos instead of hardcoding them!
// const fetchUtxoForAddress = async (address: string) => {
//   fetch(`https://api.whatsonchain.com/${address}`)
// }

const createOrdinal = async (utxo: Utxo) => {
  let tx = new Transaction(1, 0);

  // Inputs
  let utxoIn = new TxIn(
    Buffer.from(utxo.txid, "hex"),
    utxo.vout,
    Script.from_asm_string("")
  );

  tx.add_input(utxoIn);
  // Outputs
  const ordHex = "ord".toHex();

  const fsBuffer = Buffer.from(fireShard, "base64");
  const fireShardHex = fsBuffer.toString("hex");
  const fireShardMediaType = "model/gltf-binary".toHex();
  const mapPrefixHex = MAP_PREFIX.toHex();
  const mapCmdValue = "SET".toHex();
  const mapAppField = "app".toHex();
  const mapAppValue = "ord-demo".toHex();
  const mapTypeField = "type".toHex();
  const mapTypeValue = "post".toHex();
  const mapContextField = "context".toHex();
  const mapGeohashKey = "geohash".toHex();
  const mapGeohashValue = "dhxnd1pwn".toHex();

  // Create ordinal output and inscription in a single output
  const inscriptionScript = Script.from_asm_string(
    `${destinationPublicKey
      .to_address()
      .get_locking_script()
      .to_asm_string()} OP_0 OP_IF ${ordHex} OP_1 ${fireShardMediaType} OP_0 ${fireShardHex} OP_ENDIF OP_RETURN ${mapPrefixHex} ${mapCmdValue} ${mapAppField} ${mapAppValue} ${mapTypeField} ${mapTypeValue} ${mapContextField} ${mapGeohashKey} ${mapGeohashKey} ${mapGeohashValue}`
  );

  const paymentPk = PrivateKey.from_wif(paymentWif);

  let satOut = new TxOut(BigInt(1), inscriptionScript);
  tx.add_output(satOut);

  // add change
  const change = utxo.satoshis - 1 - Math.ceil(satOut.to_bytes().length / 3);
  const changeScript = changeaddr.get_locking_script();
  let changeOut = new TxOut(BigInt(change), changeScript);
  tx.add_output(changeOut);
  const sig = tx.sign(
    paymentPk,
    SigHash.ALL | SigHash.FORKID,
    0,
    Script.from_asm_string(utxo.script),
    BigInt(utxo.satoshis)
  );

  utxoIn.set_unlocking_script(
    Script.from_asm_string(
      `${sig.to_hex()} ${paymentPk.to_public_key().to_hex()}`
    )
  );

  tx.set_input(0, utxoIn);

  console.log({ tx: tx.to_hex() });
};

const sendOrdinal = async (paymentUtxo: Utxo, ordinal: Utxo) => {
  let tx = new Transaction(1, 0);

  let ordIn = new TxIn(
    Buffer.from(ordinal.txid, "hex"),
    ordinal.vout,
    Script.from_asm_string("")
  );
  tx.add_input(ordIn);

  // Inputs
  let utxoIn = new TxIn(
    Buffer.from(paymentUtxo.txid, "hex"),
    paymentUtxo.vout,
    Script.from_asm_string("")
  );

  tx.add_input(utxoIn);

  const sendScript = destination2PublicKey
    .to_p2pkh_address()
    .get_locking_script();

  const paymentPk = PrivateKey.from_wif(paymentWif);
  const ordPk = PrivateKey.from_wif(ordinalWif);

  let satOut = new TxOut(BigInt(1), sendScript);
  tx.add_output(satOut);

  // add change
  const change = utxo.satoshis - Math.ceil(tx.get_size() / 3);
  const changeScript = changeaddr.get_locking_script();
  let changeOut = new TxOut(BigInt(change), changeScript);
  tx.add_output(changeOut);

  // sign ordinal
  const sig = tx.sign(
    ordPk,
    SigHash.ALL | SigHash.FORKID,
    0,
    Script.from_asm_string(ordinal.script),
    BigInt(ordinal.satoshis)
  );

  ordIn.set_unlocking_script(
    Script.from_asm_string(`${sig.to_hex()} ${ordPk.to_public_key().to_hex()}`)
  );

  tx.set_input(0, ordIn);

  // sign fee payment
  const sig2 = tx.sign(
    paymentPk,
    SigHash.ALL | SigHash.FORKID,
    1,
    Script.from_asm_string(paymentUtxo.script),
    BigInt(paymentUtxo.satoshis)
  );

  utxoIn.set_unlocking_script(
    Script.from_asm_string(
      `${sig2.to_hex()} ${paymentPk.to_public_key().to_hex()}`
    )
  );

  tx.set_input(1, utxoIn);

  console.log({ tx: tx.to_hex() });
};

// Utxo of the p2pkh + ord inscription combination
const ordinal: Utxo = {
  satoshis: 1,
  txid: "10f4465cd18c39fbc7aa4089268e57fc719bf19c8c24f2e09156f4a89a2809d6",
  script:
    "OP_DUP OP_HASH160 9cc74552f4cbc188358fedb5fa001c8768e303a4 OP_EQUALVERIFY OP_CHECKSIG OP_0 OP_IF 6f7264 OP_1 6d6f64656c2f676c74662d62696e617279 OP_0 676c544602000000686e0c006c0700004a534f4e7b226173736574223a7b2267656e657261746f72223a224d6963726f736f667420474c5446204578706f7274657220322e382e332e3430222c2276657273696f6e223a22322e30227d2c226163636573736f7273223a5b7b2262756666657256696577223a302c22636f6d706f6e656e7454797065223a353132352c22636f756e74223a3334382c2274797065223a225343414c4152227d2c7b2262756666657256696577223a312c22636f6d706f6e656e7454797065223a353132362c22636f756e74223a3334382c2274797065223a2256454333222c226d6178223a5b302e333632323634393930383036353739362c312e313535383538393933353330323733352c302e34303932303630303239353036363833365d2c226d696e223a5b2d302e34353232323839393331373734313339362c2d302e363235303739393839343333323838362c2d302e34303635343939393031373731353435365d7d2c7b2262756666657256696577223a322c22636f6d706f6e656e7454797065223a353132362c22636f756e74223a3334382c2274797065223a2256454333227d2c7b2262756666657256696577223a332c22636f6d706f6e656e7454797065223a353132362c22636f756e74223a3334382c2274797065223a2256454334227d2c7b2262756666657256696577223a342c22636f6d706f6e656e7454797065223a353132362c22636f756e74223a3334382c2274797065223a2256454332227d5d2c226275666665725669657773223a5b7b22627566666572223a302c22627974654f6666736574223a302c22627974654c656e677468223a313339322c22746172676574223a33343936337d2c7b22627566666572223a302c22627974654f6666736574223a313339322c22627974654c656e677468223a343137362c22746172676574223a33343936327d2c7b22627566666572223a302c22627974654f6666736574223a353536382c22627974654c656e677468223a343137362c22746172676574223a33343936327d2c7b22627566666572223a302c22627974654f6666736574223a393734342c22627974654c656e677468223a353536382c22746172676574223a33343936327d2c7b22627566666572223a302c22627974654f6666736574223a31353331322c22627974654c656e677468223a323738342c22746172676574223a33343936327d2c7b22627566666572223a302c22627974654f6666736574223a31383039362c22627974654c656e677468223a3739343636397d5d2c2262756666657273223a5b7b22627974654c656e677468223a3831323736357d5d2c22696d61676573223a5b7b2262756666657256696577223a352c226d696d6554797065223a22696d6167652f706e67227d5d2c226d6174657269616c73223a5b7b227062724d6574616c6c6963526f7567686e657373223a7b2262617365436f6c6f7254657874757265223a7b22696e646578223a307d2c226d6574616c6c6963466163746f72223a302e302c22726f7567686e657373466163746f72223a302e313039383033393239393234393634397d2c22646f75626c655369646564223a747275657d5d2c226d6573686573223a5b7b227072696d697469766573223a5b7b2261747472696275746573223a7b2254414e47454e54223a332c224e4f524d414c223a322c22504f534954494f4e223a312c22544558434f4f52445f30223a347d2c22696e6469636573223a302c226d6174657269616c223a307d5d7d5d2c226e6f646573223a5b7b226368696c6472656e223a5b315d2c22726f746174696f6e223a5b2d302e373037313036373039343830323835362c302e302c2d302e302c302e373037313036383238363839353735325d2c227363616c65223a5b312e302c302e393939393939393430333935333535322c302e393939393939393430333935333535325d2c226e616d65223a22526f6f744e6f64652028676c7466206f7269656e746174696f6e206d617472697829227d2c7b226368696c6472656e223a5b325d2c226e616d65223a22526f6f744e6f646520286d6f64656c20636f7272656374696f6e206d617472697829227d2c7b226368696c6472656e223a5b335d2c22726f746174696f6e223a5b302e373037313036373639303834393330342c302e302c302e302c302e373037313036373639303834393330345d2c226e616d65223a2239333730323164343932623334663065396338343537623066313361613066652e666278227d2c7b226368696c6472656e223a5b345d2c226e616d65223a22526f6f744e6f6465227d2c7b226368696c6472656e223a5b355d2c226e616d65223a226372797374616c4c6f773a4d657368227d2c7b226d657368223a302c226e616d65223a226372797374616c4c6f773a4d6573685f6c616d62657274345f30227d5d2c2273616d706c657273223a5b7b226d616746696c746572223a393732392c226d696e46696c746572223a393938377d5d2c227363656e6573223a5b7b226e6f646573223a5b305d7d5d2c227465787475726573223a5b7b2273616d706c6572223a302c22736f75726365223a307d5d2c227363656e65223a307de0660c0042494e00000000000100000002000000030000000400000005000000060000000700000008000000090000000a0000000b0000000c0000000d0000000e0000000f000000100000001100000012000000130000001400000015000000160000001700000018000000190000001a0000001b0000001c0000001d0000001e0000001f000000200000002100000022000000230000002400000025000000260000002700000028000000290000002a0000002b0000002c0000002d0000002e0000002f000000300000003100000032000000330000003400000035000000360000003700000038000000390000003a0000003b0000003c0000003d0000003e000000 OP_ENDIF OP_RETURN 3150755161374b36324d694b43747373534c4b79316b683536575755374d74555235 534554 617070 6f72642d64656d6f 74797065 706f7374 636f6e74657874 67656f68617368 67656f68617368 6468786e643170776e",
  vout: 0,
};

// oridinal ordinal using OP_RETURN
// const ordinal: Utxo = {
//   satoshis: 1,
//   txid: "9447993185813ce88ae115faec6ef9cd26309ec21ce451e02d6c0a5ef9685a67",
//   script:
//     "OP_DUP OP_HASH160 9cc74552f4cbc188358fedb5fa001c8768e303a4 OP_EQUALVERIFY OP_CHECKSIG",
//   vout: 0,
// };

// utxo once we changed format to include OP_IF based inscription
const utxo: Utxo = {
  satoshis: 269156,
  txid: "10f4465cd18c39fbc7aa4089268e57fc719bf19c8c24f2e09156f4a89a2809d6",
  script:
    "OP_DUP OP_HASH160 df936f6867bf13de0feef81b3fd14804c35e8cc6 OP_EQUALVERIFY OP_CHECKSIG",
  vout: 1,
};

// Third utxo before we decided to change protocol again to include the OP_IF wrapper
// const utxo: Utxo = {
//   satoshis: 269938,
//   txid: "11e120270c2302a8bde450baec1265f65cdd682091d7937fabb959b092114c27",
//   script:
//     "OP_DUP OP_HASH160 df936f6867bf13de0feef81b3fd14804c35e8cc6 OP_EQUALVERIFY OP_CHECKSIG",
//   vout: 1,
// };

// Second utxo used to inscribe with "ord" in OP_RETURN (1sat p2pkh)
// const utxo: Utxo = {
//   satoshis: 270720,
//   txid: "9447993185813ce88ae115faec6ef9cd26309ec21ce451e02d6c0a5ef9685a67",
//   script:
//     "OP_DUP OP_HASH160 df936f6867bf13de0feef81b3fd14804c35e8cc6 OP_EQUALVERIFY OP_CHECKSIG",
//   vout: 2,
// };
// Initial test UTXO using B inscription
// const utxo: Utxo = {
//   satoshis: 271902,
//   txid: "28302ee1ac9c62b0098ee741e4cffad2798a6bbbd2f53467d6e7ca9829b1ac2a",
//   script:
//     "OP_DUP OP_HASH160 df936f6867bf13de0feef81b3fd14804c35e8cc6 OP_EQUALVERIFY OP_CHECKSIG",
//   vout: 0,
// };

// createOrdinal(utxo);
sendOrdinal(utxo, ordinal);

//  model/gltf-binary content type, base64 encoded
const fireShard =
  "Z2xURgIAAABobgwAbAcAAEpTT057ImFzc2V0Ijp7ImdlbmVyYXRvciI6Ik1pY3Jvc29mdCBHTFRGIEV4cG9ydGVyIDIuOC4zLjQwIiwidmVyc2lvbiI6IjIuMCJ9LCJhY2Nlc3NvcnMiOlt7ImJ1ZmZlclZpZXciOjAsImNvbXBvbmVudFR5cGUiOjUxMjUsImNvdW50IjozNDgsInR5cGUiOiJTQ0FMQVIifSx7ImJ1ZmZlclZpZXciOjEsImNvbXBvbmVudFR5cGUiOjUxMjYsImNvdW50IjozNDgsInR5cGUiOiJWRUMzIiwibWF4IjpbMC4zNjIyNjQ5OTA4MDY1Nzk2LDEuMTU1ODU4OTkzNTMwMjczNSwwLjQwOTIwNjAwMjk1MDY2ODM2XSwibWluIjpbLTAuNDUyMjI4OTkzMTc3NDEzOTYsLTAuNjI1MDc5OTg5NDMzMjg4NiwtMC40MDY1NDk5OTAxNzcxNTQ1Nl19LHsiYnVmZmVyVmlldyI6MiwiY29tcG9uZW50VHlwZSI6NTEyNiwiY291bnQiOjM0OCwidHlwZSI6IlZFQzMifSx7ImJ1ZmZlclZpZXciOjMsImNvbXBvbmVudFR5cGUiOjUxMjYsImNvdW50IjozNDgsInR5cGUiOiJWRUM0In0seyJidWZmZXJWaWV3Ijo0LCJjb21wb25lbnRUeXBlIjo1MTI2LCJjb3VudCI6MzQ4LCJ0eXBlIjoiVkVDMiJ9XSwiYnVmZmVyVmlld3MiOlt7ImJ1ZmZlciI6MCwiYnl0ZU9mZnNldCI6MCwiYnl0ZUxlbmd0aCI6MTM5MiwidGFyZ2V0IjozNDk2M30seyJidWZmZXIiOjAsImJ5dGVPZmZzZXQiOjEzOTIsImJ5dGVMZW5ndGgiOjQxNzYsInRhcmdldCI6MzQ5NjJ9LHsiYnVmZmVyIjowLCJieXRlT2Zmc2V0Ijo1NTY4LCJieXRlTGVuZ3RoIjo0MTc2LCJ0YXJnZXQiOjM0OTYyfSx7ImJ1ZmZlciI6MCwiYnl0ZU9mZnNldCI6OTc0NCwiYnl0ZUxlbmd0aCI6NTU2OCwidGFyZ2V0IjozNDk2Mn0seyJidWZmZXIiOjAsImJ5dGVPZmZzZXQiOjE1MzEyLCJieXRlTGVuZ3RoIjoyNzg0LCJ0YXJnZXQiOjM0OTYyfSx7ImJ1ZmZlciI6MCwiYnl0ZU9mZnNldCI6MTgwOTYsImJ5dGVMZW5ndGgiOjc5NDY2OX1dLCJidWZmZXJzIjpbeyJieXRlTGVuZ3RoIjo4MTI3NjV9XSwiaW1hZ2VzIjpbeyJidWZmZXJWaWV3Ijo1LCJtaW1lVHlwZSI6ImltYWdlL3BuZyJ9XSwibWF0ZXJpYWxzIjpbeyJwYnJNZXRhbGxpY1JvdWdobmVzcyI6eyJiYXNlQ29sb3JUZXh0dXJlIjp7ImluZGV4IjowfSwibWV0YWxsaWNGYWN0b3IiOjAuMCwicm91Z2huZXNzRmFjdG9yIjowLjEwOTgwMzkyOTkyNDk2NDl9LCJkb3VibGVTaWRlZCI6dHJ1ZX1dLCJtZXNoZXMiOlt7InByaW1pdGl2ZXMiOlt7ImF0dHJpYnV0ZXMiOnsiVEFOR0VOVCI6MywiTk9STUFMIjoyLCJQT1NJVElPTiI6MSwiVEVYQ09PUkRfMCI6NH0sImluZGljZXMiOjAsIm1hdGVyaWFsIjowfV19XSwibm9kZXMiOlt7ImNoaWxkcmVuIjpbMV0sInJvdGF0aW9uIjpbLTAuNzA3MTA2NzA5NDgwMjg1NiwwLjAsLTAuMCwwLjcwNzEwNjgyODY4OTU3NTJdLCJzY2FsZSI6WzEuMCwwLjk5OTk5OTk0MDM5NTM1NTIsMC45OTk5OTk5NDAzOTUzNTUyXSwibmFtZSI6IlJvb3ROb2RlIChnbHRmIG9yaWVudGF0aW9uIG1hdHJpeCkifSx7ImNoaWxkcmVuIjpbMl0sIm5hbWUiOiJSb290Tm9kZSAobW9kZWwgY29ycmVjdGlvbiBtYXRyaXgpIn0seyJjaGlsZHJlbiI6WzNdLCJyb3RhdGlvbiI6WzAuNzA3MTA2NzY5MDg0OTMwNCwwLjAsMC4wLDAuNzA3MTA2NzY5MDg0OTMwNF0sIm5hbWUiOiI5MzcwMjFkNDkyYjM0ZjBlOWM4NDU3YjBmMTNhYTBmZS5mYngifSx7ImNoaWxkcmVuIjpbNF0sIm5hbWUiOiJSb290Tm9kZSJ9LHsiY2hpbGRyZW4iOls1XSwibmFtZSI6ImNyeXN0YWxMb3c6TWVzaCJ9LHsibWVzaCI6MCwibmFtZSI6ImNyeXN0YWxMb3c6TWVzaF9sYW1iZXJ0NF8wIn1dLCJzYW1wbGVycyI6W3sibWFnRmlsdGVyIjo5NzI5LCJtaW5GaWx0ZXIiOjk5ODd9XSwic2NlbmVzIjpbeyJub2RlcyI6WzBdfV0sInRleHR1cmVzIjpbeyJzYW1wbGVyIjowLCJzb3VyY2UiOjB9XSwic2NlbmUiOjB94GYMAEJJTgAAAAAAAQAAAAIAAAADAAAABAAAAAUAAAAGAAAABwAAAAgAAAAJAAAACgAAAAsAAAAMAAAADQAAAA4AAAAPAAAAEAAAABEAAAASAAAAEwAAABQAAAAVAAAAFgAAABcAAAAYAAAAGQAAABoAAAAbAAAAHAAAAB0AAAAeAAAAHwAAACAAAAAhAAAAIgAAACMAAAAkAAAAJQAAACYAAAAnAAAAKAAAACkAAAAqAAAAKwAAACwAAAAtAAAALgAAAC8AAAAwAAAAMQAAADIAAAAzAAAANAAAADUAAAA2AAAANwAAADgAAAA5AAAAOgAAADsAAAA8AAAAPQAAAD4AAAA=";
