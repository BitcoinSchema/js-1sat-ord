import {
	type Transaction,
	type UnlockingScript,
	fromUtxo,
	type TransactionInput,
	Utils,
	P2PKH,
} from "@bsv/sdk";
import { type NftUtxo, TokenType, type TokenUtxo, type Utxo } from "../types";
import { API_HOST } from "../constants";

const { fromBase58Check } = Utils;

/**
 * Converts a Utxo object with a base64 encoded script to a Utxo object with a hex encoded script
 * @param {Utxo} utxo - Utxo object with base64 encoded script
 * @param {Object} unlockScriptTemplate - Object with sign and estimateLength functions
 * @returns {TransactionInput} Utxo object with hex encoded script
 */
export const inputFromB64Utxo = (
	utxo: Utxo,
	unlockScriptTemplate: {
		sign: (tx: Transaction, inputIndex: number) => Promise<UnlockingScript>;
		estimateLength: (tx: Transaction, inputIndex: number) => Promise<number>;
	},
): TransactionInput => {
	const input = fromUtxo(
		{
			...utxo,
			script: Buffer.from(utxo.script, "base64").toString("hex"),
		},
		unlockScriptTemplate,
	);
	input.sourceTXID = utxo.txid;
	return input;
};

/**
 * Fetches pay utxos from the API
 * @param {string} address - Address to fetch utxos for
 * @returns {Promise<Utxo[]>} Array of pay utxos
 */
export const fetchPayUtxos = async (address: string): Promise<Utxo[]> => {
	const payUrl = `${API_HOST}/txos/address/${address}/unspent?bsv20=false`;
	console.log({ payUrl });
	const payRes = await fetch(payUrl);
	if (!payRes.ok) {
		throw new Error("Error fetching pay utxos");
	}
	let payUtxos = await payRes.json();
	// exclude all 1 satoshi utxos
	payUtxos = payUtxos.filter((u: { satoshis: number }) => u.satoshis !== 1);

	// Get pubkey hash from address
	const pubKeyHash = fromBase58Check(address);
	const p2pkhScript = new P2PKH().lock(pubKeyHash.data);
	payUtxos = payUtxos.map((utxo: Partial<Utxo>) => ({
		txid: utxo.txid,
		vout: utxo.vout,
		satoshis: utxo.satoshis,
		script: Buffer.from(p2pkhScript.toBinary()).toString("base64"),
	}));
	return payUtxos as Utxo[];
};

/**
 * Fetches NFT utxos from the API
 * @param {string} address - Address to fetch utxos for
 * @param {string} [collectionId] - Optional. Collection id (collection insciprtion origin)
 * @param {number} [limit=10] - Optional. Number of utxos to fetch. Default is 10
 * @param {number} [offset=0] - Optional. Offset for fetching utxos. Default is 0
 * @returns {Promise<Utxo[]>} Array of NFT utxos
 */
export const fetchNftUtxos = async (
	address: string,
	collectionId?: string,
	limit = 10,
	offset = 0,
): Promise<NftUtxo[]> => {
	let url = `${API_HOST}/txos/address/${address}/unspent?limit=${limit}&offset=${offset}&`;

	if (collectionId) {
		const query = {
			map: {
				subTypeData: { collectionId },
			},
		};
		const b64Query = Buffer.from(JSON.stringify(query)).toString("base64");
		url += `q=${b64Query}`;
	}

	console.log({ url });
	const res = await fetch(url);
	if (!res.ok) {
		throw new Error(`Error fetching NFT utxos for ${address}`);
	}

	// Returns a BSV20Txo but we only need a few fields
	let nftUtxos = await res.json();

	// Only include 1 satoshi outputs, non listings
	nftUtxos = nftUtxos.filter(
		(u: {
			satoshis: number;
			data: { list: { price: number; payout: string } | undefined } | null;
		}) => u.satoshis === 1 && !u.data?.list,
	);

	const outpoints = nftUtxos.map(
		(utxo: { txid: string; vout: number }) => `${utxo.txid}_${utxo.vout}`,
	);
	// Fetch the scripts up to the limit
	const nftRes = await fetch(`${API_HOST}/txos/outpoints`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify([...outpoints]),
	});

	if (!nftRes.ok) {
		throw new Error(`Error fetching NFT scripts for ${address}`);
	}

	const nfts = (await nftRes.json() || [])

	nftUtxos = nfts.map(
		(utxo: {
			origin: { outpoint: string };
			script: string;
			vout: number;
			txid: string;
		}) => {
			const nftUtxo = {
				origin: utxo.origin.outpoint,
				script: utxo.script,
				vout: utxo.vout,
				txid: utxo.txid,
				satoshis: 1,
			} as NftUtxo;
			if (collectionId) {
				nftUtxo.collectionId = collectionId;
			}
			return nftUtxo;
		},
	);

	return nftUtxos as NftUtxo[];
};

/**
 * Fetches token utxos from the API
 * @param {TokenType} protocol - Token protocol. Either BSV20 or BSV21
 * @param {string} tokenId - Token id. Ticker for BSV20 and id (mint+deploy inscription origin) for BSV21
 * @param {string} address - Address to fetch utxos for
 * @returns {Promise<TokenUtxo[]>} Array of token utxos
 */
export const fetchTokenUtxos = async (
	protocol: TokenType,
	tokenId: string,
	address: string,
): Promise<TokenUtxo[]> => {
	const url = `${API_HOST}/bsv20/${address}/${protocol === TokenType.BSV20 ? "tick" : "id"}/${tokenId}?bsv20=true&listing=false`;
	console.log({ url });
	const res = await fetch(url);
	if (!res.ok) {
		throw new Error(`Error fetching ${protocol} utxos`);
	}

	// returns a BSV20Txo but we only need a few fields
	let tokenUtxos = await res.json();

	tokenUtxos = tokenUtxos.map((utxo: Partial<TokenUtxo>) => ({
		amt: utxo.amt,
		script: utxo.script,
		vout: utxo.vout,
		txid: utxo.txid,
		id: tokenId,
		satoshis: 1,
	}));

	return tokenUtxos as TokenUtxo[];
};
