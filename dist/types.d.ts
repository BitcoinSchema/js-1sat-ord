import type { PrivateKey, Transaction } from "@bsv/sdk";
import type { AuthToken } from "sigma-protocol";
type Signer = {};
export interface LocalSigner extends Signer {
    idKey: PrivateKey;
}
export interface RemoteSigner extends Signer {
    keyHost: string;
    authToken?: AuthToken;
}
export type Destination = {
    address: string;
    inscription?: Inscription;
};
/**
 * @typedef {Object} Distribution
 * @property {string} address - Destination address. Must be a Ordinals address (BSV address for recieving 1Sat ordinals tokens).
 * @property {string} amt - Number of tokens as a string, considering decimals. Not display format. Ex. 100000000 for 1 token with 8 decimal places.
 */
export type Distribution = {
    address: string;
    amt: string;
};
/**
 * @typedef {Object} Utxo
 * @property {number} satoshis - Amount in satoshis
 * @property {string} txid - Transaction id
 * @property {number} vout - Output index
 * @property {string} script - Base64 encoded locking script
 */
export type Utxo = {
    satoshis: number;
    txid: string;
    vout: number;
    script: string;
};
/**
 * @typedef {Object} NftUtxo
 * @property {string} collectionId - Optional. Collection id of the NFT
 * @property {string} contentType - Media type of the NFT
 * @property {string} creatorBapId - Optional. Creator BAP id of the NFT
 * @property {string} origin - Origin address of the NFT
 * @property {number} satoshis - Always 1
 */
export interface NftUtxo extends Utxo {
    collectionId?: string;
    contentType: string;
    creatorBapId?: string;
    origin: string;
    satoshis: 1;
}
/**
 * @typedef {Object} TokenUtxo
 * @property {string} amt - Number of tokens as a string
 * @property {string} id - Token id -  either tick or id depending on protocol
 * @property {string} satoshis - Always 1
 */
export interface TokenUtxo extends Utxo {
    amt: string;
    id: string;
    satoshis: 1;
}
export type Inscription = {
    dataB64: string;
    contentType: string;
};
export type ImageContentType = "image/png" | "image/jpeg" | "image/gif" | "image/svg+xml" | "image/webp";
/**
 * @typedef {Object} IconInscription
 * @property {string} dataB64 - Base64 encoded image data. Must be a square image.
 * @property {ImageContentType} contentType - Media type of the image
 */
export type IconInscription = {
    dataB64: string;
    contentType: ImageContentType;
};
export type MAP = {
    app: string;
    type: string;
    [prop: string]: string;
};
export type Payment = {
    to: string;
    amount: number;
};
export type TokenInscription = {
    p: "bsv-20";
    amt: string;
    op: "transfer" | "mint" | "deploy+mint";
};
export interface MintTokenInscription extends TokenInscription {
    op: "mint";
}
export interface DeployMintTokenInscription extends TokenInscription {
    op: "deploy+mint";
    sym: string;
    icon: string;
}
export interface TransferTokenInscription extends TokenInscription {
    p: "bsv-20";
    amt: string;
    op: "transfer";
}
export interface TransferBSV20Inscription extends TransferTokenInscription {
    tick: string;
}
export interface TransferBSV21Inscription extends TransferTokenInscription {
    id: string;
}
export declare enum TokenType {
    BSV20 = "bsv20",
    BSV21 = "bsv21"
}
export type CreateOrdinalsResult = {
    tx: Transaction;
    spentOutpoints: string[];
    payChange?: Utxo;
};
export type CreateOrdinalsConfig = {
    utxos: Utxo[];
    destinations: Destination[];
    paymentPk: PrivateKey;
    changeAddress?: string;
    satsPerKb?: number;
    metaData?: MAP;
    signer?: LocalSigner | RemoteSigner;
    additionalPayments?: Payment[];
};
/**
 * Configuration object for creating an ordinals collection
 * @typedef {Object} CreateOrdinalsCollectionConfig
 * @property metaData - MAP (Magic Attribute Protocol) metadata for the collection
 * @property metaData.type - "ord"
 * @property metaData.subType - "collection"
 * @property metaData.name - Collection name
 * @property metaData.subTypeData - JSON stringified CollectionSubTypeData
 * @property [metaData.royalties] - Optional. Royalties address
 * @property [metaData.previewUrl] - Optional. Preview URL
 */
export interface CreateOrdinalsCollectionConfig extends CreateOrdinalsConfig {
    metaData: MAP & {
        type: "ord";
        name: string;
        subType: "collection";
        subTypeData: string;
        royalties?: string;
        previewUrl?: string;
    };
}
export interface CollectionSubTypeData {
    description: string;
    quantity: number;
    rarityLabels: string;
    traits: string;
}
/**
 * Configuration object for creating an ordinals collection item
 * @typedef {Object} CreateOrdinalsCollectionItemConfig
 * @property metaData - MAP (Magic Attribute Protocol) metadata for the collection item
 * @property metaData.type - "ord"
 * @property metaData.subType - "collectionItem"
 * @property metaData.name - Collection item name
 * @property metaData.subTypeData - JSON stringified CollectionItemSubTypeData
 * @property [metaData.royalties] - Optional. Royalties address
 * @property [metaData.previewUrl] - Optional. Preview URL
 */
export interface CreateOrdinalsCollectionItemConfig extends CreateOrdinalsConfig {
    metaData: MAP & {
        type: "ord";
        name: string;
        subType: "collectionItem";
        subTypeData: string;
        royalties?: string;
        previewUrl?: string;
    };
}
export interface CollectionItemSubTypeData {
    collectionId: string;
    mintNumner: number;
    rank: number;
    rarityLabel: string;
    traits: string;
    attachments: string;
}
export type SendOrdinalsResult = {
    tx: Transaction;
    spentOutpoints: string[];
    payChange?: Utxo;
};
export type SendOrdinalsConfig = {
    paymentUtxos: Utxo[];
    ordinals: Utxo[];
    paymentPk: PrivateKey;
    ordPk: PrivateKey;
    destinations: Destination[];
    changeAddress?: string;
    satsPerKb?: number;
    metaData?: MAP;
    signer?: LocalSigner | RemoteSigner;
    additionalPayments?: Payment[];
    enforceUniformSend?: boolean;
};
export type DeployBsv21TokenResult = {
    tx: Transaction;
    spentOutpoints: string[];
    payChange?: Utxo;
};
export type DeployBsv21TokenConfig = {
    symbol: string;
    icon: string | IconInscription;
    utxos: Utxo[];
    initialDistribution: Distribution;
    paymentPk: PrivateKey;
    destinationAddress: string;
    changeAddress?: string;
    satsPerKb?: number;
    additionalPayments?: Payment[];
};
export type SendUtxosResult = {
    tx: Transaction;
    spentOutpoints: string[];
    payChange?: Utxo;
};
export type SendUtxosConfig = {
    utxos: Utxo[];
    paymentPk: PrivateKey;
    payments: Payment[];
    satsPerKb?: number;
    changeAddress?: string;
};
export interface TransferOrdTokensResult extends SendOrdinalsResult {
    tokenChange?: TokenUtxo;
}
export type TransferOrdTokensConfig = {
    protocol: TokenType;
    tokenID: string;
    utxos: Utxo[];
    inputTokens: TokenUtxo[];
    distributions: Distribution[];
    paymentPk: PrivateKey;
    ordPk: PrivateKey;
    changeAddress?: string;
    tokenChangeAddress?: string;
    satsPerKb?: number;
    metaData?: MAP;
    signer?: LocalSigner | RemoteSigner;
    additionalPayments?: Payment[];
};
export {};
