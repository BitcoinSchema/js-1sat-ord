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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendUtxos = exports.sendOrdinal = exports.createOrdinal = exports.buildInscription = void 0;
const bsv_wasm_1 = require("bsv-wasm");
const buffer_1 = require("buffer");
const dotenv = __importStar(require("dotenv"));
const strings_js_1 = require("./utils/strings.js");
dotenv.config();
const MAP_PREFIX = "1PuQa7K62MiKCtssSLKy1kh56WWU7MtUR5";
const buildInscription = (destinationAddress, b64File, mediaType, metaData) => {
    const ordHex = (0, strings_js_1.toHex)("ord");
    const fsBuffer = buffer_1.Buffer.from(b64File, "base64");
    const fireShardHex = fsBuffer.toString("hex");
    const fireShardMediaType = (0, strings_js_1.toHex)(mediaType);
    // Create ordinal output and inscription in a single output
    let inscriptionAsm = `${destinationAddress
        .get_locking_script()
        .to_asm_string()} OP_0 OP_IF ${ordHex} OP_1 ${fireShardMediaType} OP_0 ${fireShardHex} OP_ENDIF`;
    // MAP.app and MAP.type keys are required
    if (metaData && (metaData === null || metaData === void 0 ? void 0 : metaData.app) && (metaData === null || metaData === void 0 ? void 0 : metaData.type)) {
        const mapPrefixHex = (0, strings_js_1.toHex)(MAP_PREFIX);
        const mapCmdValue = (0, strings_js_1.toHex)("SET");
        inscriptionAsm = `${inscriptionAsm} OP_RETURN ${mapPrefixHex} ${mapCmdValue}`;
        for (const [key, value] of Object.entries(metaData)) {
            if (key !== "cmd") {
                inscriptionAsm = `${inscriptionAsm} ${(0, strings_js_1.toHex)(key)} ${(0, strings_js_1.toHex)(value)}`;
            }
        }
    }
    return bsv_wasm_1.Script.from_asm_string(inscriptionAsm);
};
exports.buildInscription = buildInscription;
const createOrdinal = (utxo, destinationAddress, paymentPk, changeAddress, satPerByteFee, inscription, metaData) => __awaiter(void 0, void 0, void 0, function* () {
    let tx = new bsv_wasm_1.Transaction(1, 0);
    // Inputs
    let utxoIn = new bsv_wasm_1.TxIn(buffer_1.Buffer.from(utxo.txid, "hex"), utxo.vout, bsv_wasm_1.Script.from_asm_string(""));
    tx.add_input(utxoIn);
    // Outputs
    const inscriptionScript = buildInscription(bsv_wasm_1.P2PKHAddress.from_string(destinationAddress), inscription.dataB64, inscription.contentType, metaData);
    let satOut = new bsv_wasm_1.TxOut(BigInt(1), inscriptionScript);
    tx.add_output(satOut);
    // add change
    const changeaddr = bsv_wasm_1.P2PKHAddress.from_string(changeAddress);
    const changeScript = changeaddr.get_locking_script();
    let emptyOut = new bsv_wasm_1.TxOut(BigInt(1), changeScript);
    const fee = Math.ceil(satPerByteFee * (tx.get_size() + emptyOut.to_bytes().byteLength));
    const change = utxo.satoshis - 1 - fee;
    if (change < 0)
        throw new Error("Inadequate satoshis for fee");
    if (change > 0) {
        let changeOut = new bsv_wasm_1.TxOut(BigInt(change), changeScript);
        tx.add_output(changeOut);
    }
    const sig = tx.sign(paymentPk, bsv_wasm_1.SigHash.ALL | bsv_wasm_1.SigHash.FORKID, 0, bsv_wasm_1.Script.from_asm_string(utxo.script), BigInt(utxo.satoshis));
    utxoIn.set_unlocking_script(bsv_wasm_1.Script.from_asm_string(`${sig.to_hex()} ${paymentPk.to_public_key().to_hex()}`));
    tx.set_input(0, utxoIn);
    return tx;
});
exports.createOrdinal = createOrdinal;
const sendOrdinal = (paymentUtxo, ordinal, paymentPk, changeAddress, satPerByteFee, ordPk, ordDestinationAddress, reinscription, metaData) => __awaiter(void 0, void 0, void 0, function* () {
    let tx = new bsv_wasm_1.Transaction(1, 0);
    let ordIn = new bsv_wasm_1.TxIn(buffer_1.Buffer.from(ordinal.txid, "hex"), ordinal.vout, bsv_wasm_1.Script.from_asm_string(""));
    tx.add_input(ordIn);
    // Inputs
    let utxoIn = new bsv_wasm_1.TxIn(buffer_1.Buffer.from(paymentUtxo.txid, "hex"), paymentUtxo.vout, bsv_wasm_1.Script.from_asm_string(""));
    tx.add_input(utxoIn);
    let s;
    const destinationAddress = bsv_wasm_1.P2PKHAddress.from_string(ordDestinationAddress);
    if ((reinscription === null || reinscription === void 0 ? void 0 : reinscription.dataB64) && (reinscription === null || reinscription === void 0 ? void 0 : reinscription.contentType)) {
        s = buildInscription(destinationAddress, reinscription.dataB64, reinscription.contentType, metaData);
    }
    else {
        s = destinationAddress.get_locking_script();
    }
    let satOut = new bsv_wasm_1.TxOut(BigInt(1), s);
    tx.add_output(satOut);
    // add change
    const changeaddr = bsv_wasm_1.P2PKHAddress.from_string(changeAddress);
    const changeScript = changeaddr.get_locking_script();
    let emptyOut = new bsv_wasm_1.TxOut(BigInt(1), changeScript);
    const fee = Math.ceil(satPerByteFee * (tx.get_size() + emptyOut.to_bytes().byteLength));
    const change = paymentUtxo.satoshis - fee;
    let changeOut = new bsv_wasm_1.TxOut(BigInt(change), changeScript);
    tx.add_output(changeOut);
    // sign ordinal
    const sig = tx.sign(ordPk, bsv_wasm_1.SigHash.InputOutput, 0, bsv_wasm_1.Script.from_asm_string(ordinal.script), BigInt(ordinal.satoshis));
    ordIn.set_unlocking_script(bsv_wasm_1.Script.from_asm_string(`${sig.to_hex()} ${ordPk.to_public_key().to_hex()}`));
    tx.set_input(0, ordIn);
    // sign fee payment
    const sig2 = tx.sign(paymentPk, bsv_wasm_1.SigHash.InputOutput, 1, bsv_wasm_1.Script.from_asm_string(paymentUtxo.script), BigInt(paymentUtxo.satoshis));
    utxoIn.set_unlocking_script(bsv_wasm_1.Script.from_asm_string(`${sig2.to_hex()} ${paymentPk.to_public_key().to_hex()}`));
    tx.set_input(1, utxoIn);
    return tx;
});
exports.sendOrdinal = sendOrdinal;
// sendUtxos sends p2pkh utxos to the given destinationAddress
const sendUtxos = (utxos, paymentPk, address, feeSats) => __awaiter(void 0, void 0, void 0, function* () {
    const tx = new bsv_wasm_1.Transaction(1, 0);
    // Outputs
    let inputValue = 0;
    for (let u of utxos || []) {
        inputValue += u.satoshis;
    }
    const satsIn = inputValue;
    const satsOut = satsIn - feeSats;
    console.log({ feeSats, satsIn, satsOut });
    tx.add_output(new bsv_wasm_1.TxOut(BigInt(satsOut), address.get_locking_script()));
    // build txins from our UTXOs
    let idx = 0;
    for (let u of utxos || []) {
        console.log({ u });
        const inx = new bsv_wasm_1.TxIn(buffer_1.Buffer.from(u.txid, "hex"), u.vout, bsv_wasm_1.Script.from_asm_string(""));
        console.log({ inx });
        inx.set_satoshis(BigInt(u.satoshis));
        tx.add_input(inx);
        const sig = tx.sign(paymentPk, bsv_wasm_1.SigHash.InputOutputs, idx, bsv_wasm_1.Script.from_asm_string(u.script), BigInt(u.satoshis));
        inx.set_unlocking_script(bsv_wasm_1.Script.from_asm_string(`${sig.to_hex()} ${paymentPk.to_public_key().to_hex()}`));
        tx.set_input(idx, inx);
        idx++;
    }
    return tx;
});
exports.sendUtxos = sendUtxos;
