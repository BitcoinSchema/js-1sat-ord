import {
	type Destination,
	TokenType,
	type TransferBSV20Inscription,
	type TransferTokenInscription,
	type TransferBSV21Inscription,
	type TransferOrdTokensConfig,
	type TransferOrdTokensResult,
	type SendOrdinalsConfig,
	type TokenUtxo,
} from "./types";
import { DEFAULT_SAT_PER_KB } from "./constants";
import { sendOrdinals } from "./sendOrdinals";

/**
 * Transfer tokens to a destination
 * @param {TransferOrdTokensConfig} config - Configuration object for transferring tokens
 * @param {TokenType} config.protocol - Token protocol. Must be TokenType.BSV20 or TokenType.BSV21
 * @param {string} config.tokenID - Token ID. Either the tick or id value depending on the protocol
 * @param {Utxo[]} config.utxos - Payment Utxos available to spend. Will only consume what is needed.
 * @param {TokenUtxo[]} config.inputTokens - Token utxos to spend
 * @param {Distribution[]} config.distributions - Array of destinations with addresses and amounts
 * @param {PrivateKey} config.paymentPk - Private key to sign paymentUtxos
 * @param {PrivateKey} config.ordPk - Private key to sign ordinals
 * @param {string} config.changeAddress - Optional. Address to send payment change to, if any. If not provided, defaults to paymentPk address
 * @param {string} config.tokenChangeAddress - Optional. Address to send token change to, if any. If not provided, defaults to ordPk address
 * @param {number} config.satsPerKb - Optional. Satoshis per kilobyte for fee calculation. Default is DEFAULT_SAT_PER_KB
 * @param {PreMAP} config.metaData - Optional. MAP (Magic Attribute Protocol) metadata to include in inscriptions
 * @param {LocalSigner | RemoteSigner} config.signer - Optional. Signer object to sign the transaction
 * @param {Payment[]} config.additionalPayments - Optional. Additional payments to include in the transaction
 * @param {burn} config.burn - Optional. Set to true to burn the tokens.
 * @returns {Promise<TransferOrdTokensResult>} Transaction with token transfer outputs
 */
export const transferOrdTokens = async (config: TransferOrdTokensConfig): Promise<TransferOrdTokensResult> => {
	const {
		protocol,
		tokenID,
		utxos,
		inputTokens,
		distributions,
		paymentPk,
		ordPk,
		changeAddress,
		tokenChangeAddress,
		satsPerKb = DEFAULT_SAT_PER_KB,
		metaData,
		signer,
		additionalPayments = [],
		burn = false
	} = config;

	// calculate change amount
	let changeAmt = 0n;
	let totalAmtIn = 0n;
	let totalAmtOut = 0n;

	// Ensure these inputs are for the expected token
	if (!inputTokens.every(
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

	// add change to distributions
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
			op: burn ? "burn" : "transfer",
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

	const sendOrdinalsConfig: SendOrdinalsConfig = {
		paymentUtxos: utxos,
		ordinals: inputTokens,
		paymentPk,
		ordPk,
		destinations,
		changeAddress: changeAddress || paymentPk.toAddress().toString(),
		satsPerKb,
		metaData,
		signer,
		additionalPayments,
		enforceUniformSend: false
	};

	const { tx, spentOutpoints, payChange } = await sendOrdinals(sendOrdinalsConfig);

	// find the tokenChangeVout by looking for the destination with the tokenChangeAddress
	const tokenChangeVout = destinations.findIndex(
		(d) => d.address === (tokenChangeAddress || ordPk.toAddress().toString())
	);

	let tokenChange: TokenUtxo | undefined;
	if (tokenChangeVout !== -1) {
		tokenChange = {
			id: tokenID,
			amt: changeAmt.toString(),
			satoshis: 1,
			txid: tx.id("hex"),
			vout: tokenChangeVout,
			script: Buffer.from(tx.outputs[tokenChangeVout].lockingScript.toHex(), "hex").toString(
				"base64",
			),
		};
	}

	return {
		tx,
		spentOutpoints,
		payChange,
		tokenChange,
	}
};