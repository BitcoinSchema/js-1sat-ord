import { P2PKHAddress, PrivateKey, Script, Transaction } from "bsv-wasm";
type Utxo = {
    satoshis: number;
    txid: string;
    vout: number;
    script: string;
};
declare const buildInscription: (destinationAddress: P2PKHAddress, b64File: string, mediaType: string, geohash?: string, appName?: string) => Script;
declare const createOrdinal: (utxo: Utxo, destinationAddress: string, paymentPk: PrivateKey, changeAddress: string, inscription: {
    dataB64: string;
    contentType: string;
    geohash?: string;
}) => Promise<Transaction>;
declare const sendOrdinal: (paymentUtxo: Utxo, ordinal: Utxo, paymentPk: PrivateKey, changeAddress: string, ordPk: PrivateKey, ordDestinationAddress: string, reinscription: {
    file?: string;
    contentType?: string;
    geohash?: string;
}) => Promise<Transaction>;
export { buildInscription, createOrdinal, sendOrdinal };
