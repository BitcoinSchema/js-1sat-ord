"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendOrdinal = exports.createOrdinal = exports.buildInscription = void 0;
const bsv_wasm_1 = require("bsv-wasm");
const buffer_1 = require("buffer");
const dotenv = __importStar(require("dotenv"));
const strings_js_1 = require("./utils/strings.js");
dotenv.config();
const MAP_PREFIX = "1PuQa7K62MiKCtssSLKy1kh56WWU7MtUR5";
const buildInscription = (destinationAddress, b64File, mediaType, geohash, appName) => {
    const ordHex = (0, strings_js_1.toHex)("ord");
    const fsBuffer = buffer_1.Buffer.from(b64File, "base64");
    const fireShardHex = fsBuffer.toString("hex");
    const fireShardMediaType = (0, strings_js_1.toHex)(mediaType);
    // Create ordinal output and inscription in a single output
    let inscriptionAsm = `${destinationAddress
        .get_locking_script()
        .to_asm_string()} OP_0 OP_IF ${ordHex} OP_1 ${fireShardMediaType} OP_0 ${fireShardHex} OP_ENDIF`;
    if (geohash && appName) {
        const mapPrefixHex = (0, strings_js_1.toHex)(MAP_PREFIX);
        const mapCmdValue = (0, strings_js_1.toHex)("SET");
        const mapAppField = (0, strings_js_1.toHex)("app");
        const mapAppValue = (0, strings_js_1.toHex)("ord-demo");
        const mapTypeField = (0, strings_js_1.toHex)("type");
        const mapTypeValue = (0, strings_js_1.toHex)("post");
        const mapGeohashKey = (0, strings_js_1.toHex)("geohash");
        inscriptionAsm = `${inscriptionAsm} OP_RETURN ${mapPrefixHex} ${mapCmdValue} ${mapAppField} ${mapAppValue} ${mapTypeField} ${mapTypeValue} ${(0, strings_js_1.toHex)("context")} ${mapGeohashKey} ${mapGeohashKey} ${(0, strings_js_1.toHex)(geohash)}`;
    }
    return bsv_wasm_1.Script.from_asm_string(inscriptionAsm);
};
exports.buildInscription = buildInscription;
const createOrdinal = async (utxo, destinationAddress, paymentPk, changeAddress, inscription) => {
    let tx = new bsv_wasm_1.Transaction(1, 0);
    // Inputs
    let utxoIn = new bsv_wasm_1.TxIn(buffer_1.Buffer.from(utxo.txid, "hex"), utxo.vout, bsv_wasm_1.Script.from_asm_string(""));
    tx.add_input(utxoIn);
    // Outputs
    const inscriptionScript = buildInscription(bsv_wasm_1.P2PKHAddress.from_string(destinationAddress), inscription.dataB64, inscription.contentType, inscription.geohash);
    let satOut = new bsv_wasm_1.TxOut(BigInt(1), inscriptionScript);
    tx.add_output(satOut);
    // add change
    const change = utxo.satoshis - 1 - Math.ceil(satOut.to_bytes().length / 3);
    const changeaddr = bsv_wasm_1.P2PKHAddress.from_string(changeAddress);
    const changeScript = changeaddr.get_locking_script();
    let changeOut = new bsv_wasm_1.TxOut(BigInt(change), changeScript);
    tx.add_output(changeOut);
    const sig = tx.sign(paymentPk, bsv_wasm_1.SigHash.ALL | bsv_wasm_1.SigHash.FORKID, 0, bsv_wasm_1.Script.from_asm_string(utxo.script), BigInt(utxo.satoshis));
    utxoIn.set_unlocking_script(bsv_wasm_1.Script.from_asm_string(`${sig.to_hex()} ${paymentPk.to_public_key().to_hex()}`));
    tx.set_input(0, utxoIn);
    return tx;
};
exports.createOrdinal = createOrdinal;
const sendOrdinal = async (paymentUtxo, ordinal, paymentPk, changeAddress, ordPk, ordDestinationAddress, reinscription) => {
    let tx = new bsv_wasm_1.Transaction(1, 0);
    let ordIn = new bsv_wasm_1.TxIn(buffer_1.Buffer.from(ordinal.txid, "hex"), ordinal.vout, bsv_wasm_1.Script.from_asm_string(""));
    tx.add_input(ordIn);
    // Inputs
    let utxoIn = new bsv_wasm_1.TxIn(buffer_1.Buffer.from(paymentUtxo.txid, "hex"), paymentUtxo.vout, bsv_wasm_1.Script.from_asm_string(""));
    tx.add_input(utxoIn);
    let s;
    const destinationAddress = bsv_wasm_1.P2PKHAddress.from_string(ordDestinationAddress);
    if (reinscription.file && reinscription.contentType) {
        s = buildInscription(destinationAddress, reinscription.file, reinscription.contentType, reinscription.geohash);
    }
    else {
        s = destinationAddress.get_locking_script();
    }
    let satOut = new bsv_wasm_1.TxOut(BigInt(1), s);
    tx.add_output(satOut);
    // add change
    const change = paymentUtxo.satoshis - Math.ceil(tx.get_size() / 3);
    const changeaddr = bsv_wasm_1.P2PKHAddress.from_string(changeAddress);
    const changeScript = changeaddr.get_locking_script();
    let changeOut = new bsv_wasm_1.TxOut(BigInt(change), changeScript);
    tx.add_output(changeOut);
    // sign ordinal
    const sig = tx.sign(ordPk, bsv_wasm_1.SigHash.ALL | bsv_wasm_1.SigHash.FORKID, 0, bsv_wasm_1.Script.from_asm_string(ordinal.script), BigInt(ordinal.satoshis));
    ordIn.set_unlocking_script(bsv_wasm_1.Script.from_asm_string(`${sig.to_hex()} ${ordPk.to_public_key().to_hex()}`));
    tx.set_input(0, ordIn);
    // sign fee payment
    const sig2 = tx.sign(paymentPk, bsv_wasm_1.SigHash.ALL | bsv_wasm_1.SigHash.FORKID, 1, bsv_wasm_1.Script.from_asm_string(paymentUtxo.script), BigInt(paymentUtxo.satoshis));
    utxoIn.set_unlocking_script(bsv_wasm_1.Script.from_asm_string(`${sig2.to_hex()} ${paymentPk.to_public_key().to_hex()}`));
    tx.set_input(1, utxoIn);
    return tx;
};
exports.sendOrdinal = sendOrdinal;
