import { P2PKHAddress, PrivateKey, Script, Transaction } from "bsv-wasm";
import { AuthToken } from "sigma-protocol";
type Signer = {};
export interface LocalSigner extends Signer {
    idKey: PrivateKey;
}
export interface RemoteSigner extends Signer {
    keyHost: string;
    authToken?: AuthToken;
}
export type Utxo = {
    satoshis: number;
    txid: string;
    vout: number;
    script: string;
};
export type Inscription = {
    dataB64: string;
    contentType: string;
};
export type MAP = {
    app: string;
    type: string;
    [prop: string]: string | string[];
};
declare const buildInscription: (destinationAddress: P2PKHAddress, b64File?: string | undefined, mediaType?: string | undefined, metaData?: MAP | undefined) => Script;
export declare const buildReinscriptionTemplate: (ordinal: Utxo, destinationAddress: string, reinscription?: Inscription, metaData?: MAP) => Promise<Transaction>;
declare const createOrdinal: (utxo: Utxo, destinationAddress: string, paymentPk: PrivateKey, changeAddress: string, satPerByteFee: number, inscription: Inscription, metaData?: MAP, signer?: LocalSigner | RemoteSigner) => Promise<Transaction>;
declare const sendOrdinal: (paymentUtxo: Utxo, ordinal: Utxo, paymentPk: PrivateKey, changeAddress: string, satPerByteFee: number, ordPk: PrivateKey, ordDestinationAddress: string, reinscription?: Inscription, metaData?: MAP) => Promise<Transaction>;
declare const sendUtxos: (utxos: Utxo[], paymentPk: PrivateKey, address: P2PKHAddress, feeSats: number) => Promise<Transaction>;
export { buildInscription, createOrdinal, sendOrdinal, sendUtxos };
