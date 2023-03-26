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
                inscriptionAsm = `${inscriptionAsm} ${toHex(key)} ${toHex(value)}`;
            }
        }
    }
    return Script.from_asm_string(inscriptionAsm);
};
const createOrdinal = async (utxo, destinationAddress, paymentPk, changeAddress, satPerByteFee, inscription, metaData) => {
    let tx = new Transaction(1, 0);
    // Inputs
    let utxoIn = new TxIn(Buffer.from(utxo.txid, "hex"), utxo.vout, Script.from_asm_string(""));
    tx.add_input(utxoIn);
    // Outputs
    const inscriptionScript = buildInscription(P2PKHAddress.from_string(destinationAddress), inscription.dataB64, inscription.contentType, metaData);
    let satOut = new TxOut(BigInt(1), inscriptionScript);
    tx.add_output(satOut);
    // add change
    const changeaddr = P2PKHAddress.from_string(changeAddress);
    const changeScript = changeaddr.get_locking_script();
    let emptyOut = new TxOut(BigInt(1), changeScript);
    const fee = Math.ceil(satPerByteFee * (tx.get_size() + emptyOut.to_bytes().byteLength));
    const change = utxo.satoshis - 1 - fee;
    if (change < 0)
        throw new Error("Inadequate satoshis for fee");
    if (change > 0) {
        let changeOut = new TxOut(BigInt(change), changeScript);
        tx.add_output(changeOut);
    }
    const sig = tx.sign(paymentPk, SigHash.ALL | SigHash.FORKID, 0, Script.from_asm_string(utxo.script), BigInt(utxo.satoshis));
    utxoIn.set_unlocking_script(Script.from_asm_string(`${sig.to_hex()} ${paymentPk.to_public_key().to_hex()}`));
    tx.set_input(0, utxoIn);
    return tx;
};
const sendOrdinal = async (paymentUtxo, ordinal, paymentPk, changeAddress, satPerByteFee, ordPk, ordDestinationAddress, reinscription, metaData) => {
    let tx = new Transaction(1, 0);
    let ordIn = new TxIn(Buffer.from(ordinal.txid, "hex"), ordinal.vout, Script.from_asm_string(""));
    tx.add_input(ordIn);
    // Inputs
    let utxoIn = new TxIn(Buffer.from(paymentUtxo.txid, "hex"), paymentUtxo.vout, Script.from_asm_string(""));
    tx.add_input(utxoIn);
    let s;
    const destinationAddress = P2PKHAddress.from_string(ordDestinationAddress);
    if (reinscription?.dataB64 && reinscription?.contentType) {
        s = buildInscription(destinationAddress, reinscription.dataB64, reinscription.contentType, metaData);
    }
    else {
        s = destinationAddress.get_locking_script();
    }
    let satOut = new TxOut(BigInt(1), s);
    tx.add_output(satOut);
    // add change
    const changeaddr = P2PKHAddress.from_string(changeAddress);
    const changeScript = changeaddr.get_locking_script();
    let emptyOut = new TxOut(BigInt(1), changeScript);
    const fee = Math.ceil(satPerByteFee * (tx.get_size() + emptyOut.to_bytes().byteLength));
    const change = paymentUtxo.satoshis - fee;
    let changeOut = new TxOut(BigInt(change), changeScript);
    tx.add_output(changeOut);
    // sign ordinal
    const sig = tx.sign(ordPk, SigHash.InputOutputs, 0, Script.from_asm_string(ordinal.script), BigInt(ordinal.satoshis));
    ordIn.set_unlocking_script(Script.from_asm_string(`${sig.to_hex()} ${ordPk.to_public_key().to_hex()}`));
    tx.set_input(0, ordIn);
    // sign fee payment
    const sig2 = tx.sign(paymentPk, SigHash.InputOutputs, 1, Script.from_asm_string(paymentUtxo.script), BigInt(paymentUtxo.satoshis));
    utxoIn.set_unlocking_script(Script.from_asm_string(`${sig2.to_hex()} ${paymentPk.to_public_key().to_hex()}`));
    tx.set_input(1, utxoIn);
    return tx;
};
// sendUtxos sends p2pkh utxos to the given destinationAddress
const sendUtxos = async (utxos, paymentPk, address, feeSats) => {
    const tx = new Transaction(1, 0);
    // Outputs
    let inputValue = 0;
    for (let u of utxos || []) {
        inputValue += u.satoshis;
    }
    const satsIn = inputValue;
    const satsOut = satsIn - feeSats;
    console.log({ feeSats, satsIn, satsOut });
    tx.add_output(new TxOut(BigInt(satsOut), address.get_locking_script()));
    // build txins from our UTXOs
    let idx = 0;
    for (let u of utxos || []) {
        console.log({ u });
        const inx = new TxIn(Buffer.from(u.txid, "hex"), u.vout, Script.from_asm_string(""));
        console.log({ inx });
        inx.set_satoshis(BigInt(u.satoshis));
        tx.add_input(inx);
        const sig = tx.sign(paymentPk, SigHash.InputOutputs, idx, Script.from_asm_string(u.script), BigInt(u.satoshis));
        inx.set_unlocking_script(Script.from_asm_string(`${sig.to_hex()} ${paymentPk.to_public_key().to_hex()}`));
        tx.set_input(idx, inx);
        idx++;
    }
    return tx;
};
export { buildInscription, createOrdinal, sendOrdinal, sendUtxos };
