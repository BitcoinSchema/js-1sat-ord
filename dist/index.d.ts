import { type PrivateKey, Transaction } from "@bsv/sdk";
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
    rawTxHex: string;
    vout: number;
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
export declare const buildReinscriptionTemplate: (ordinal: Utxo, destinationAddress: string, reinscription?: Inscription, metaData?: MAP) => Promise<Transaction>;
export type Payment = {
    to: string;
    amount: number;
};
declare const createOrdinal: (utxos: Utxo[], destinationAddress: string, paymentPk: PrivateKey, changeAddress: string, inscriptions: Inscription[], satsPerKb?: number, metaData?: MAP, signer?: LocalSigner | RemoteSigner, additionalPayments?: Payment[]) => Promise<Transaction>;
declare const transferOrdinal: (paymentUtxos: Utxo[], ordinals: Utxo[], paymentPk: PrivateKey, changeAddress: string, ordPk: PrivateKey, ordDestinationAddress: string, satsPerKb: number, reinscription?: Inscription, metaData?: MAP, additionalPayments?: Payment[]) => Promise<Transaction>;
declare const sendUtxos: (utxos: Utxo[], paymentPk: PrivateKey, destinationAddress: string, satsPerKb: number, amount: number) => Promise<Transaction>;
export { createOrdinal, transferOrdinal, sendUtxos };
