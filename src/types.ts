import type { PrivateKey, Transaction } from "@bsv/sdk";
import type { AuthToken } from "sigma-protocol";

// biome-ignore lint/complexity/noBannedTypes: Reserved for future use
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
 * @typedef {Object} Listing
 * @property {string} payAddress - Address to send the payment upon purchase
 * @property {string} price - Listing price in satoshis
 * @property {String} ordAddress - Where to return a listed ordinal upon cancel.
 * @property {Utxo} listingUtxo - Utxo of the listing
 */
export type NewListing = {
  payAddress: string;
  price: number;
  ordAddress: string;
  listingUtxo: Utxo;
}

/**
 * @typedef {Object} ExistingListing
 * @property {string} payout - Payment output script base64 encoded
 * @property {Utxo} listingUtxo - Utxo of the listing
 */
export type ExistingListing = {
  payout: string;
  listingUtxo: Utxo;
}

/**
 * @typedef {Object} NewTokenListing
 * @property {string} payAddress - Address to send the payment upon purchase
 * @property {string} price - Listing price in satoshis
 * @property {String} ordAddress - Where to return a listed ordinal upon cancel.
 * @property {number} tokens - Number of tokens in whole token display format. Ex. 0.5 for 0.5 tokens. Library handles conversion to 'tsat' format.
 */
export type NewTokenListing = {
  payAddress: string;
  price: number;
  tokens: number;
  ordAddress: string;
}

/**
 * @typedef {Object} Distribution
 * @property {string} address - Destination address. Must be a Ordinals address (BSV address for recieving 1Sat ordinals tokens).
 * @property {number} tokens - Number of tokens in whole token display format. Ex. 0.5 for 0.5 tokens. Library handles conversion to 'tsat' format. 
 * @property {boolean} [omitMetaData] - Optional. Set to true to omit metadata from this distribution's output.
 */
export type Distribution = {
  address: string;
  tokens: number;
  omitMetaData?: boolean;
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
  pk?: PrivateKey;
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
 * @property {string} amt - Number of tokens as a string in 'tsat' format. Ex. 100000000 for 1 token with 8 decimal places.
 * @property {string} id - Token id -  either tick or id depending on protocol
 * @property {string} satoshis - Always 1
 * @property {string} [payout] - Optional. Payment output script base64 encoded
 * @property {number} [price] - Optional. Listing price in satoshis
 * @property {boolean} [isListing] - Optional. True if the token is a listing
 */
export interface TokenUtxo extends Utxo {
  amt: string;
  id: string;
  satoshis: 1;
  payout?: string;
  price?: number;
  isListing?: boolean;
  pk?: PrivateKey;
}

export enum TokenSelectionStrategy {
  SmallestFirst = "smallest",
  LargestFirst = "largest",
  RetainOrder = "retain",
  Random = "random",
}

export interface TokenSelectionOptions {
  inputStrategy?: TokenSelectionStrategy;
  outputStrategy?: TokenSelectionStrategy;
}

export interface TokenSelectionResult {
  selectedUtxos: TokenUtxo[];
  totalSelected: number;
  isEnough: boolean;
}

export type Inscription = {
  dataB64: string;
  contentType: string;
};

export type ImageContentType =
  | "image/png"
  | "image/jpeg"
  | "image/gif"
  | "image/svg+xml"
  | "image/webp";

/**
 * @typedef {Object} IconInscription
 * @property {string} dataB64 - Base64 encoded image data. Must be a square image.
 * @property {ImageContentType} contentType - Media type of the image
 */
export type IconInscription = {
  dataB64: string;
  contentType: ImageContentType;
};

export type Payment = {
  to: string;
  amount: number;
};

export type TokenInscription = {
  p: "bsv-20";
  amt: string;
  op: "transfer" | "mint" | "deploy+mint" | "burn";
  dec?: string;
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
  op: "transfer" | "burn";
}

export interface TransferBSV20Inscription extends TransferTokenInscription {
  tick: string;
}

export interface TransferBSV21Inscription extends TransferTokenInscription {
  id: string;
}

export enum TokenType {
  BSV20 = "bsv20",
  BSV21 = "bsv21",
}

export type BaseResult = {
  tx: Transaction;
  spentOutpoints: string[];
};

export interface ChangeResult extends BaseResult {
  payChange?: Utxo;
};

/**
 * MAP (Magic Attribute Protocol) metadata object with stringified values for writing to the blockchain
 * @typedef {Object} MAP
 * @property {string} app - Application identifier
 * @property {string} type - Metadata type
 * @property {string} [prop] - Optional. Additional metadata properties
 */
export type MAP = {
  app: string;
  type: string;
  [prop: string]: string;
};

export type PreMAP = {
  app: string;
  type: string;
  [prop: string]: unknown;
  royalties?: Royalty[];
  subTypeData?: CollectionSubTypeData | CollectionItemSubTypeData;
};

export type CreateOrdinalsConfig = {
  utxos: Utxo[];
  destinations: Destination[];
  paymentPk: PrivateKey;
  changeAddress?: string;
  satsPerKb?: number;
  metaData?: PreMAP;
  signer?: LocalSigner | RemoteSigner;
  additionalPayments?: Payment[];
};

export enum RoytaltyType {
  Paymail = "paymail",
  Address = "address",
  Script = "script",
}

/**
 * Royalty object
 * @typedef {Object} Royalty
 * @property {RoytaltyType} type - Royalty type, string, one of "paymail", "address", "script"
 * @property {string} destination - Royalty destination
 * @property {string} percentage - Royalty percentage as a string float 0-1 (0.01 = 1%)
 */
export type Royalty = {
  type: RoytaltyType;
  destination: string;
  percentage: string; // string float 0-1
};

export interface CreateOrdinalsMetadata extends PreMAP {
  type: "ord",
  name: string,
  previewUrl?: string,
}

export interface CreateOrdinalsCollectionMetadata extends CreateOrdinalsMetadata {
  subType: "collection",
  subTypeData: CollectionSubTypeData, // JSON stringified CollectionSubTypeData
  royalties?: Royalty[],
};

export interface CreateOrdinalsCollectionItemMetadata extends CreateOrdinalsMetadata {
  subType: "collectionItem",
  subTypeData: CollectionItemSubTypeData, // JSON stringified CollectionItemSubTypeData
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
  metaData: CreateOrdinalsCollectionMetadata
}

export type CollectionTraits = {
  [trait: string]: CollectionTrait;
};

export type CollectionTrait = {
  values: string[];
  occurancePercentages: string[];
};

export type Rarity = {
  [key: string]: string;
}

export type RarityLabels = Rarity[]
export interface CollectionSubTypeData {
  description: string;
  quantity: number;
  rarityLabels: RarityLabels;
  traits: CollectionTraits;
}

export interface CreateOrdinalsCollectionItemMetadata extends PreMAP {
  type: "ord",
  name: string,
  subType: "collectionItem",
  subTypeData: CollectionItemSubTypeData, // JSON stringified CollectionItemSubTypeData
  previewUrl?: string,
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
  metaData: CreateOrdinalsCollectionItemMetadata
}

/**
 * Subtype data for an ordinals collection item
 * @typedef {Object} CollectionItemSubTypeData
 * @property {string} collectionId - Collection id
 * @property {number} mintNumner - Mint number
 * @property {number} rank - Rank
 * @property {string} rarityLabel - Rarity label
 * @property {string} traits - traits object
 * @property {string} attachments - array of attachment objects
 */
export interface CollectionItemSubTypeData {
  collectionId: string;
  mintNumber?: number;
  rank?: number;
  rarityLabel?: RarityLabels;
  traits?: CollectionItemTrait[];
  attachments?: CollectionItemAttachment[];
}

export type CollectionItemTrait = {
  name: string;
  value: string;
  rarityLabel?: string;
  occurancePercentrage?: string;
};

export type CollectionItemAttachment = {
  name: string;
  description?: string;
  "content-type": string;
  url: string;
}

export interface BurnMAP extends MAP {
  type: "ord";
  op: "burn";
}

export type BurnOrdinalsConfig = {
  ordPk: PrivateKey;
  ordinals: Utxo[];
  metaData?: BurnMAP;
}

export type SendOrdinalsConfig = {
  paymentUtxos: Utxo[];
  ordinals: Utxo[];
  paymentPk: PrivateKey;
  ordPk: PrivateKey;
  destinations: Destination[];
  changeAddress?: string;
  satsPerKb?: number;
  metaData?: PreMAP;
  signer?: LocalSigner | RemoteSigner;
  additionalPayments?: Payment[];
  enforceUniformSend?: boolean;
}

export type DeployBsv21TokenConfig = {
  symbol: string;
  decimals?: number;
  icon: string | IconInscription;
  utxos: Utxo[];
  initialDistribution: Distribution;
  paymentPk: PrivateKey;
  destinationAddress: string;
  changeAddress?: string;
  satsPerKb?: number;
  additionalPayments?: Payment[];
};

export type SendUtxosConfig = {
  utxos: Utxo[];
  paymentPk: PrivateKey;
  payments: Payment[];
  satsPerKb?: number;
  changeAddress?: string;
  metaData?: MAP;
};

export interface TokenChangeResult extends ChangeResult {
  tokenChange?: TokenUtxo[];
}

/**
 * Configuration object for token outputs
 * @typedef {Object} TokenSplitConfig
 * @property {number} outputs - Number of outputs to split the token into. Default is 1.
 * @property {number} threshold - Optional. Minimum amount of tokens per output.
 * @property {boolean} omitMetaData - Set to true to omit metadata from the token change outputs
 **/
export type TokenSplitConfig = {
  outputs: number;
  threshold?: number;
  omitMetaData?: boolean;
}

export enum TokenInputMode {
  All = "all",
  Needed = "needed",
}

/**
 * Configuration object for transferring token ordinals
 * @typedef {Object} TransferOrdTokensConfig
 * @property {TokenType} protocol - Token protocol
 * @property {string} tokenID - Token id
 * @property {number} decimals - Number of decimal places for this token.
 * @property {Utxo[]} utxos - Array of payment Utxos
 * @property {TokenUtxo[]} inputTokens - Array of TokenUtxos to be transferred
 * @property {Distribution[]} distributions - Array of Distribution objects
 * @property {PrivateKey} paymentPk - Private key of the payment address
 * @property {PrivateKey} ordPk - Private key of the ord address
 * @property {string} [changeAddress] - Optional. Address to send the change
 * @property {string} [tokenChangeAddress] - Optional. Address to send the token change
 * @property {number} [satsPerKb] - Optional. Satoshis per kilobyte
 * @property {PreMAP} [metaData] - Optional. MAP metadata object
 * @property {LocalSigner | RemoteSigner} [signer] - Optional. Signer object
 * @property {Payment[]} [additionalPayments] - Optional. Array of additional payments
 * @property {boolean} [burn] - Optional. Set to true to burn the input tokens
 * @property {TokenSplitConfig} [splitConfig] - Optional. Configuration object for splitting token change
 * @property {TokenInputMode} [tokenInputMode] - Optional. Token input mode. Default is "needed"
 */
export type TransferOrdTokensConfig = {
  protocol: TokenType;
  tokenID: string;
  decimals: number;
  utxos: Utxo[];
  inputTokens: TokenUtxo[];
  distributions: Distribution[];
  paymentPk?: PrivateKey;
  ordPk?: PrivateKey;
  inputMode?: TokenInputMode;
  changeAddress?: string;
  tokenChangeAddress?: string;
  satsPerKb?: number;
  metaData?: PreMAP;
  signer?: LocalSigner | RemoteSigner;
  additionalPayments?: Payment[];
  burn?: boolean;
  splitConfig?: TokenSplitConfig;
  tokenInputMode?: TokenInputMode;
}

export type CreateOrdListingsConfig = {
  utxos: Utxo[];
  listings: NewListing[];
  paymentPk: PrivateKey;
  ordPk: PrivateKey,
  changeAddress?: string;
  satsPerKb?: number;
  additionalPayments?: Payment[];
}

export type PurchaseOrdListingConfig = {
  utxos: Utxo[];
  paymentPk: PrivateKey;
  listing: ExistingListing;
  ordAddress: string;
  changeAddress?: string;
  satsPerKb?: number;
  additionalPayments?: Payment[],
  royalties?: Royalty[],
  metaData?: MAP,
}

export type PurchaseOrdTokenListingConfig = {
  protocol: TokenType;
  tokenID: string;
  utxos: Utxo[];
  paymentPk: PrivateKey;
  listingUtxo: TokenUtxo;
  ordAddress: string;
  changeAddress?: string;
  satsPerKb?: number;
  additionalPayments?: Payment[],
  metaData?: MAP,
}

export type CancelOrdListingsConfig = {
  utxos: Utxo[],
  paymentPk: PrivateKey;
  ordPk: PrivateKey;
  listingUtxos: Utxo[];
  additionalPayments?: Payment[];
  changeAddress?: string;
  satsPerKb?: number;
}

export interface CancelOrdTokenListingsConfig extends CancelOrdListingsConfig {
  utxos: Utxo[],
  paymentPk: PrivateKey;
  ordPk: PrivateKey;
  listingUtxos: TokenUtxo[];
  additionalPayments: Payment[];
  changeAddress?: string;
  satsPerKb?: number;
  protocol: TokenType,
  tokenID: string;
  ordAddress?: string;
}

/**
 * Configuration object for creating a token listing
 * @typedef {Object} CreateOrdTokenListingsConfig
 * @property {Utxo[]} utxos - Array of payment Utxos
 * @property {TokenUtxo[]} inputTokens - Array of TokenUtxos to be listed
 * @property {NewTokenListing[]} listings - Array of NewTokenListings
 * @property {PrivateKey} paymentPk - Private key of the payment address
 * @property {PrivateKey} ordPk - Private key of the ord address
 * @property {string} tokenChangeAddress - Address to send the token change
 * @property {number} [satsPerKb] - Optional. Satoshis per kilobyte
 * @property {Payment[]} [additionalPayments] - Optional. Array of additional payments
 * @property {TokenType} protocol - Token protocol
 * @property {string} tokenID - Token id
 * @property {number} decimals - Number of decimal places for this token.
 */
export interface CreateOrdTokenListingsConfig {
  utxos: Utxo[];
  listings: NewTokenListing[];
  paymentPk: PrivateKey;
  ordPk: PrivateKey,
  changeAddress?: string;
  satsPerKb?: number;
  additionalPayments?: Payment[];
  protocol: TokenType;
  tokenID: string;
  decimals: number;
  inputTokens: TokenUtxo[];
  tokenChangeAddress: string;
}

export const MAX_TOKEN_SUPPLY = 2n ** 64n - 1n;