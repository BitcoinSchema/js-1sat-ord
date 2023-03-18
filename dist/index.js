import { P2PKHAddress, Script, SigHash, Transaction, TxIn, TxOut, } from "bsv-wasm";
import { Buffer } from "buffer";
import * as dotenv from "dotenv";
import { toHex } from "./utils/strings.js";
dotenv.config();
const MAP_PREFIX = "1PuQa7K62MiKCtssSLKy1kh56WWU7MtUR5";
const buildInscription = (destinationAddress, b64File, mediaType, metaData) => {
    const ordHex = toHex("ord");
    const fsBuffer = Buffer.from(b64File, "base64");
    const fireShardHex = fsBuffer.toString("hex");
    const fireShardMediaType = toHex(mediaType);
    // Create ordinal output and inscription in a single output
    let inscriptionAsm = `${destinationAddress
        .get_locking_script()
        .to_asm_string()} OP_0 OP_IF ${ordHex} OP_1 ${fireShardMediaType} OP_0 ${fireShardHex} OP_ENDIF`;
    // MAP.app and MAP.type keys are required
    if (metaData && metaData?.app && metaData?.type) {
        const mapPrefixHex = toHex(MAP_PREFIX);
        const mapCmdValue = toHex("SET");
        inscriptionAsm = `${inscriptionAsm} OP_RETURN ${mapPrefixHex} ${mapCmdValue}`;
        for (const [key, value] of Object.entries(metaData)) {
            if (key !== "cmd") {
                inscriptionAsm = `${inscriptionAsm} ${key} ${value}`;
            }
        }
    }
    return Script.from_asm_string(inscriptionAsm);
};
const createOrdinal = async (utxo, destinationAddress, paymentPk, changeAddress, inscription, metaData) => {
    let tx = new Transaction(1, 0);
    // Inputs
    let utxoIn = new TxIn(Buffer.from(utxo.txid, "hex"), utxo.vout, Script.from_asm_string(""));
    tx.add_input(utxoIn);
    // Outputs
    const inscriptionScript = buildInscription(P2PKHAddress.from_string(destinationAddress), inscription.dataB64, inscription.contentType, metaData);
    let satOut = new TxOut(BigInt(1), inscriptionScript);
    tx.add_output(satOut);
    // add change
    const change = utxo.satoshis - 1 - Math.ceil(satOut.to_bytes().length / 3);
    const changeaddr = P2PKHAddress.from_string(changeAddress);
    const changeScript = changeaddr.get_locking_script();
    let changeOut = new TxOut(BigInt(change), changeScript);
    tx.add_output(changeOut);
    const sig = tx.sign(paymentPk, SigHash.ALL | SigHash.FORKID, 0, Script.from_asm_string(utxo.script), BigInt(utxo.satoshis));
    utxoIn.set_unlocking_script(Script.from_asm_string(`${sig.to_hex()} ${paymentPk.to_public_key().to_hex()}`));
    tx.set_input(0, utxoIn);
    return tx;
};
const sendOrdinal = async (paymentUtxo, ordinal, paymentPk, changeAddress, ordPk, ordDestinationAddress, reinscription, metaData) => {
    let tx = new Transaction(1, 0);
    let ordIn = new TxIn(Buffer.from(ordinal.txid, "hex"), ordinal.vout, Script.from_asm_string(""));
    tx.add_input(ordIn);
    // Inputs
    let utxoIn = new TxIn(Buffer.from(paymentUtxo.txid, "hex"), paymentUtxo.vout, Script.from_asm_string(""));
    tx.add_input(utxoIn);
    let s;
    const destinationAddress = P2PKHAddress.from_string(ordDestinationAddress);
    if (reinscription?.file && reinscription?.contentType) {
        s = buildInscription(destinationAddress, reinscription.file, reinscription.contentType, metaData);
    }
    else {
        s = destinationAddress.get_locking_script();
    }
    let satOut = new TxOut(BigInt(1), s);
    tx.add_output(satOut);
    // add change
    const change = paymentUtxo.satoshis - Math.ceil(tx.get_size() / 3);
    const changeaddr = P2PKHAddress.from_string(changeAddress);
    const changeScript = changeaddr.get_locking_script();
    let changeOut = new TxOut(BigInt(change), changeScript);
    tx.add_output(changeOut);
    // sign ordinal
    const sig = tx.sign(ordPk, SigHash.ALL | SigHash.FORKID, 0, Script.from_asm_string(ordinal.script), BigInt(ordinal.satoshis));
    ordIn.set_unlocking_script(Script.from_asm_string(`${sig.to_hex()} ${ordPk.to_public_key().to_hex()}`));
    tx.set_input(0, ordIn);
    // sign fee payment
    const sig2 = tx.sign(paymentPk, SigHash.ALL | SigHash.FORKID, 1, Script.from_asm_string(paymentUtxo.script), BigInt(paymentUtxo.satoshis));
    utxoIn.set_unlocking_script(Script.from_asm_string(`${sig2.to_hex()} ${paymentPk.to_public_key().to_hex()}`));
    tx.set_input(1, utxoIn);
    return tx;
};
export { buildInscription, createOrdinal, sendOrdinal };
