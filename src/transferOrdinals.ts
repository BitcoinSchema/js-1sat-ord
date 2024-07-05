import type {
	PrivateKey,
	Transaction,
} from "@bsv/sdk";
import {
	type Destination,
	type Distribution,
	type LocalSigner,
	type MAP,
	type Payment,
	type RemoteSigner,
	TokenType,
	type TokenUtxo,
	type TransferBSV20Inscription,
	type TransferTokenInscription,
	type Utxo,
  type TransferBSV21Inscription,
} from "./types";
import { DEFAULT_SAT_PER_KB } from "./constants";
import { sendOrdinals } from "./sendOrdinals";

/**
 * Transfer tokens to a destination
 * @param {TokenType} protocol - Token protocol. Must be TokenType.BSV20 or TokenType.BSV21
 * @param {string} tokenID - Token ID. Either the tick or id value depending on the protocol
 * @param {Utxo[]} utxos - Payment Utxos available to spend. Will only consume what is needed.
 * @param {TokenUtxo[]} inputTokens - Token utxos to spend
 * @param {Distribution[]} distributions - Array of destinations with addresses and amounts
 * @param {PrivateKey} paymentPk - Private key to sign paymentUtxos
 * @param {PrivateKey} ordPk - Private key to sign ordinals
 * @param {string} changeAddress - Address to send payment change to, if any. If not provided, defaults to paymentPk address
 * @param {string} tokenChangeAddress - Address to send token change to, if any. If not provided, defaults to ordPk address
 * @param {number} satsPerKb - (optional) Satoshis per kilobyte for fee calculation. Default is DEFAULT_SAT_PER_KB
 * @param {MAP} metaData - (optional) MAP (Magic Attribute Protocol) metadata to include in inscriptions
 * @param {LocalSigner | RemoteSigner} signer - (optional) Signer object to sign the transaction
 * @param {Payment[]} additionalPayments - (optional) Additional payments to include in the transaction
 * @returns {Promise<Transaction>} Transaction with token transfer outputs
 */
export const transferOrdTokens = async (
	protocol: TokenType,
	tokenID: string, // either tick or id depending on protocol
	utxos: Utxo[],
	inputTokens: TokenUtxo[],
	distributions: Distribution[],
	paymentPk: PrivateKey,
  ordPk: PrivateKey,
	changeAddress?: string,
  tokenChangeAddress?: string,
	satsPerKb: number = DEFAULT_SAT_PER_KB,
	metaData?: MAP,
	signer?: LocalSigner | RemoteSigner,
	additionalPayments: Payment[] = [],
): Promise<Transaction> => {
	// calculate change amount
	let changeAmt = 0n;
	let totalAmtIn = 0n;
	let totalAmtOut = 0n;

  // Ensure these inputs are for the expected token
	if(!inputTokens.every(
		(token) => token.id === tokenID,
	)) {
    throw new Error("Input tokens do not match the provided tokenID");
  }

	for (const token of inputTokens) {
		totalAmtIn += BigInt(token.amt);
	}

	for (const dest of distributions) {
		totalAmtOut += BigInt(dest.amt);
	}

	// check that you have enough tokens to send
	if (totalAmtIn < totalAmtOut) {
		throw new Error("Not enough tokens to send");
	}

	changeAmt = totalAmtIn - totalAmtOut;

	// add change to destinations
	if (changeAmt > 0n) {
		const changeDistribution = {
			address: tokenChangeAddress || ordPk.toAddress().toString(),
			amt: changeAmt.toString(),
		};
		distributions.push(changeDistribution);
	}

	// build destination inscriptions
	const destinations: Destination[] = distributions.map((dest) => {
		const transferInscription: TransferTokenInscription = {
			p: "bsv-20",
			op: "transfer",
			amt: dest.amt,
		}
    let inscription: TransferBSV20Inscription | TransferBSV21Inscription;
		if (protocol === TokenType.BSV20) {
      inscription = {
        ...transferInscription,
        tick: tokenID,
      } as TransferBSV20Inscription;
		} else if (protocol === TokenType.BSV21) {
      inscription = {
        ...transferInscription,
        id: tokenID,
      } as TransferBSV21Inscription;
    } else {
      throw new Error("Invalid protocol");
    }

		return {
			address: dest.address,
			inscription: {
				dataB64: Buffer.from(JSON.stringify(inscription)).toString("base64"),
				contentType: "application/bsv-20",
			},
		};
	});

	// chaeck that
	const tx = await sendOrdinals(
		utxos,
		inputTokens,
		paymentPk,
		ordPk,
		destinations,
		changeAddress || paymentPk.toAddress().toString(),
		satsPerKb,
		metaData,
    signer,
		additionalPayments,
		false
	);
	
	return tx;
};
