import {
	type Transaction,
	type UnlockingScript,
	fromUtxo,
	type TransactionInput,
	Utils,
	P2PKH,
	Script,
} from "@bsv/sdk";
import { type NftUtxo, type TokenSelectionOptions, type TokenSelectionResult, TokenSelectionStrategy, TokenType, type TokenUtxo, type Utxo } from "../types";
import { API_HOST } from "../constants";
import { toToken } from "satoshi-token";

const { fromBase58Check } = Utils;

// Standard P2PKH unlocking script size: ~107 bytes
// (1 byte push + 71-72 bytes signature + 1 byte push + 33 bytes pubkey)
const P2PKH_UNLOCK_SIZE = 107;

/**
 * Converts a Utxo object with a base64 encoded script to a TransactionInput
 * @param {Utxo} utxo - Utxo object with base64 encoded script
 * @param {Object} [unlockScriptTemplate] - Optional. Object with sign and estimateLength functions.
 *   When omitted, creates input for external signing (signInputs: false mode) with fee estimation only.
 * @returns {TransactionInput} Transaction input with source info
 */
export const inputFromB64Utxo = (
	utxo: Utxo,
	unlockScriptTemplate?: {
		sign: (tx: Transaction, inputIndex: number) => Promise<UnlockingScript>;
		estimateLength: (tx: Transaction, inputIndex: number) => Promise<number>;
	},
): TransactionInput => {
	const utxoHex = {
		...utxo,
		script: Buffer.from(utxo.script, "base64").toString("hex"),
	};

	if (unlockScriptTemplate) {
		return fromUtxo(utxoHex, unlockScriptTemplate);
	}

	// For signInputs: false mode - create input that supports fee estimation
	// but will be signed externally (e.g., by wallet).
	// Uses fromUtxo with a template that estimates size but throws on sign.
	return fromUtxo(utxoHex, {
		estimateLength: async () => P2PKH_UNLOCK_SIZE,
		sign: async () => {
			throw new Error(
				"Cannot sign input: transaction was built with signInputs: false. " +
				"This input must be signed externally (e.g., by a wallet)."
			);
		},
	});
};

/**
 * Fetches pay utxos from the API
 * @param {string} address - Address to fetch utxos for
 * @returns {Promise<Utxo[]>} Array of pay utxos
 */
export const fetchPayUtxos = async (address: string, scriptEncoding: "hex" | "base64" | "asm" = "base64"): Promise<Utxo[]> => {
	const payUrl = `${API_HOST}/txos/address/${address}/unspent?bsv20=false`;
	const payRes = await fetch(payUrl);
	if (!payRes.ok) {
		throw new Error("Error fetching pay utxos");
	}
	let payUtxos = await payRes.json();
	// exclude all 1 satoshi utxos
	payUtxos = payUtxos.filter((u: Utxo) => u.satoshis !== 1 && !isLock(u));

	// Get pubkey hash from address
	const pubKeyHash = fromBase58Check(address);
	const p2pkhScript = new P2PKH().lock(pubKeyHash.data);
	payUtxos = payUtxos.map((utxo: Partial<Utxo>) => ({
		txid: utxo.txid,
		vout: utxo.vout,
		satoshis: utxo.satoshis,
		script: scriptEncoding === "hex" || scriptEncoding === "base64" ? Buffer.from(p2pkhScript.toBinary()).toString(scriptEncoding) : p2pkhScript.toASM(),
	}));
	return payUtxos as Utxo[];
};

/**
 * Fetches NFT utxos from the API
 * @param {string} address - Address to fetch utxos for
 * @param {string} [collectionId] - Optional. Collection id (collection insciprtion origin)
 * @param {number} [limit=10] - Optional. Number of utxos to fetch. Default is 10
 * @param {number} [offset=0] - Optional. Offset for fetching utxos. Default is 0
 * @param {string} [scriptEncoding="base64"] - Optional. Encoding for the script. Default is base64. Options are hex, base64, or asm.
 * @returns {Promise<Utxo[]>} Array of NFT utxos
 */
export const fetchNftUtxos = async (
	address: string,
	collectionId?: string,
	limit = 10,
	offset = 0,
  scriptEncoding: "hex" | "base64" | "asm" = "base64",
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
	const nftRes = await fetch(`${API_HOST}/txos/outpoints?script=true`, {
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
      let script = utxo.script;
      if (scriptEncoding === "hex") {
        script = Buffer.from(script, "base64").toString("hex");
      } else if (scriptEncoding === "asm") {
        script = Script.fromHex(Buffer.from(script, "base64").toString("hex")).toASM();
      }
			const nftUtxo = {
				origin: utxo.origin.outpoint,
				script,
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
 * @param {number} [limit=10] - Number of utxos to fetch. Default is 10
 * @param {number} [offset=0] - Offset for fetching utxos. Default is 0
 * @returns {Promise<TokenUtxo[]>} Array of token utxos
 */
export const fetchTokenUtxos = async (
	protocol: TokenType,
	tokenId: string,
	address: string,
  limit = 10,
  offset = 0,
): Promise<TokenUtxo[]> => {
	const url = `${API_HOST}/bsv20/${address}/${protocol === TokenType.BSV20 ? "tick" : "id"}/${tokenId}?bsv20=true&listing=false&limit=${limit}&offset=${offset}`;
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

const isLock = (utxo: Utxo) => {
  return !!(utxo as unknown as { data?: {lock: { address: string, until: number } }}).data?.lock;
}

/**
 * Selects token UTXOs based on the required amount and specified strategies.
 * @param {TokenUtxo[]} tokenUtxos - Array of token UTXOs.
 * @param {number} requiredTokens - Required amount in tokens (displayed amount).
 * @param {number} decimals - Number of decimal places for the token.
 * @param {TokenSelectionOptions} [options={}] - Options for token selection.
 * @returns {TokenSelectionResult} Selected token UTXOs and total selected amount.
 */
export const selectTokenUtxos = (
  tokenUtxos: TokenUtxo[],
  requiredTokens: number,
  decimals: number,
  options: TokenSelectionOptions = {}
): TokenSelectionResult => {
  const {
    inputStrategy = TokenSelectionStrategy.RetainOrder,
    outputStrategy = TokenSelectionStrategy.RetainOrder,
  } = options;
  
  // Sort the UTXOs based on the input strategy
  const sortedUtxos = [...tokenUtxos].sort((a, b) => {
    if (inputStrategy === TokenSelectionStrategy.RetainOrder) return 0;
    const amtA = BigInt(a.amt);
    const amtB = BigInt(b.amt);

    switch (inputStrategy) {
      case TokenSelectionStrategy.SmallestFirst:
        return Number(amtA - amtB);
      case TokenSelectionStrategy.LargestFirst:
        return Number(amtB - amtA);
      case TokenSelectionStrategy.Random:
        return Math.random() - 0.5;
      default:
        return 0;
    }
  });

  let totalSelected = 0;
  const selectedUtxos: TokenUtxo[] = [];

  for (const utxo of sortedUtxos) {
    selectedUtxos.push(utxo);
    totalSelected += toToken(utxo.amt, decimals);
    if (totalSelected >= requiredTokens && requiredTokens > 0) {
      break;
    }
  }

  // Sort the selected UTXOs based on the output strategy
  if (outputStrategy !== TokenSelectionStrategy.RetainOrder) {
    selectedUtxos.sort((a, b) => {
      const amtA = BigInt(a.amt);
      const amtB = BigInt(b.amt);

      switch (outputStrategy) {
        case TokenSelectionStrategy.SmallestFirst:
          return Number(amtA - amtB);
        case TokenSelectionStrategy.LargestFirst:
          return Number(amtB - amtA);
        case TokenSelectionStrategy.Random:
          return Math.random() - 0.5;
        default:
          return 0;
      }
    });
  }

  return {
    selectedUtxos,
    totalSelected,
    isEnough: totalSelected >= requiredTokens
  };
};