import { type PrivateKey, type Script, Transaction } from "@bsv/sdk";
import { type AuthToken } from "sigma-protocol";
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
declare const buildInscription: (destinationAddress: string, b64File?: string | undefined, mediaType?: string | undefined, metaData?: MAP | undefined) => Script;
export declare const buildReinscriptionTemplate: (ordinal: Utxo, destinationAddress: string, reinscription?: Inscription, metaData?: MAP) => Promise<Transaction>;
export type Payment = {
    to: string;
    amount: number;
};
declare const createOrdinal: (utxo: Utxo, destinationAddress: string, paymentPk: PrivateKey, changeAddress: string, satPerByteFee: number, inscription: Inscription, metaData?: MAP, signer?: LocalSigner | RemoteSigner, additionalPayments?: Payment[]) => Promise<Transaction>;
declare const sendOrdinal: (paymentUtxo: Utxo, ordinal: Utxo, paymentPk: PrivateKey, changeAddress: string, satPerByteFee: number, ordPk: PrivateKey, ordDestinationAddress: string, reinscription?: Inscription, metaData?: MAP, additionalPayments?: Payment[]) => Promise<Transaction>;
declare const sendUtxos: (utxos: Utxo[], paymentPk: PrivateKey, address: string, feeSats: number) => Promise<Transaction>;
export declare const P2PKH_INPUT_SCRIPT_SIZE = 107;
export declare const P2PKH_FULL_INPUT_SIZE = 148;
export declare const P2PKH_OUTPUT_SIZE = 34;
export { buildInscription, createOrdinal, sendOrdinal, sendUtxos };
