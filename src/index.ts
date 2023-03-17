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
import { toHex } from "./utils/strings.js";

dotenv.config();

type Utxo = {
  satoshis: number;
  txid: string;
  vout: number;
  script: string;
};

// The wif for funding the tx
const paymentWif = process.env.PAYMENT_WIF as string;

// The key to use when signing inscriptions with AIP
// TODO: (not yet implemented)
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

const buildInscription = (
  b64File: string,
  mediaType: string,
  geohash?: string
): Script => {
  const ordHex = toHex("ord");
  const fsBuffer = Buffer.from(b64File, "base64");
  const fireShardHex = fsBuffer.toString("hex");
  const fireShardMediaType = toHex(mediaType);
  const mapPrefixHex = toHex(MAP_PREFIX);
  const mapCmdValue = toHex("SET");
  const mapAppField = toHex("app");
  const mapAppValue = toHex("ord-demo");
  const mapTypeField = toHex("type");
  const mapTypeValue = toHex("post");

  // Create ordinal output and inscription in a single output
  let inscriptionAsm = `${destinationPublicKey
    .to_address()
    .get_locking_script()
    .to_asm_string()} OP_0 OP_IF ${ordHex} OP_1 ${fireShardMediaType} OP_0 ${fireShardHex} OP_ENDIF OP_RETURN ${mapPrefixHex} ${mapCmdValue} ${mapAppField} ${mapAppValue} ${mapTypeField} ${mapTypeValue}`;

  if (geohash) {
    const mapGeohashKey = toHex("geohash");
    inscriptionAsm = `${inscriptionAsm} ${toHex(
      "context"
    )} ${mapGeohashKey} ${mapGeohashKey} ${toHex(geohash)}`;
  }

  return Script.from_asm_string(inscriptionAsm);
};

const createOrdinal = async (
  utxo: Utxo,
  inscription: {
    dataB64: string;
    contentType: string;
    geohash?: string;
  }
) => {
  let tx = new Transaction(1, 0);

  // Inputs
  let utxoIn = new TxIn(
    Buffer.from(utxo.txid, "hex"),
    utxo.vout,
    Script.from_asm_string("")
  );

  tx.add_input(utxoIn);

  // Outputs
  const inscriptionScript = buildInscription(
    inscription.dataB64,
    inscription.contentType,
    inscription.geohash
  );

  let satOut = new TxOut(BigInt(1), inscriptionScript);
  tx.add_output(satOut);

  const paymentPk = PrivateKey.from_wif(paymentWif);
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

  return tx;
};

const sendOrdinal = async (
  paymentUtxo: Utxo,
  ordinal: Utxo,
  paymentPk: PrivateKey,
  ordPk: PrivateKey,
  reinscription: {
    file?: string;
    contentType?: string;
    geohash?: string;
  }
) => {
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

  let s: Script;
  if (reinscription.file && reinscription.contentType) {
    s = buildInscription(
      reinscription.file,
      reinscription.contentType,
      reinscription.geohash
    );
  } else {
    s = destination2PublicKey.to_p2pkh_address().get_locking_script();
  }
  let satOut = new TxOut(BigInt(1), s);
  tx.add_output(satOut);

  // add change
  const change = paymentUtxo.satoshis - Math.ceil(tx.get_size() / 3);
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

export { createOrdinal, sendOrdinal };
