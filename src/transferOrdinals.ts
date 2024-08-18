import {
	P2PKH,
	type PrivateKey,
	SatoshisPerKilobyte,
	Script,
	Transaction,
	Utils,
} from "@bsv/sdk";
import { DEFAULT_SAT_PER_KB } from "./constants";
import OrdP2PKH from "./templates/ordP2pkh";
import {
	TokenType,
	type TokenUtxo,
	type TransferBSV20Inscription,
	type TransferBSV21Inscription,
	type TransferOrdTokensConfig,
	type TokenChangeResult,
	type TransferTokenInscription,
	type Utxo,
	TokenInputMode,
	type TokenSplitConfig,
	type PreMAP,
} from "./types";
import { inputFromB64Utxo } from "./utils/utxo";
import { signData } from "./signData";
import stringifyMetaData from "./utils/subtypeData";
import { toTokenSat } from "satoshi-token";

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
 * @param {decimals} config.decimals - Number of decimal places for the token
 * @param {string} [config.changeAddress] - Optional. Address to send payment change to, if any. If not provided, defaults to paymentPk address
 * @param {string} [config.tokenChangeAddress] - Optional. Address to send token change to, if any. If not provided, defaults to ordPk address
 * @param {number} [config.satsPerKb] - Optional. Satoshis per kilobyte for fee calculation. Default is DEFAULT_SAT_PER_KB
 * @param {PreMAP} [config.metaData] - Optional. MAP (Magic Attribute Protocol) metadata to include in inscriptions
 * @param {LocalSigner | RemoteSigner} [config.signer] - Optional. Signer object to sign the transaction
 * @param {Payment[]} [config.additionalPayments] - Optional. Additional payments to include in the transaction
 * @param {TokenInputMode} [config.tokenInputMode] - Optional. "all" or "needed". Default is "needed"
 * @param {TokenSplitConfig} [config.tokenSplitConfig] - Optional. Configuration object for splitting token change
 * @param {burn} [config.burn] - Optional. Set to true to burn the tokens.
 * @returns {Promise<TokenChangeResult>} Transaction with token transfer outputs
 */
export const transferOrdTokens = async (
	config: TransferOrdTokensConfig,
): Promise<TokenChangeResult> => {
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
		decimals,
		additionalPayments = [],
		burn = false,
		tokenInputMode = TokenInputMode.Needed,
		splitConfig = {
			outputs: 1,
			omitMetaData: false,
		},
	} = config;

	// Ensure these inputs are for the expected token
	if (!inputTokens.every((token) => token.id === tokenID)) {
		throw new Error("Input tokens do not match the provided tokenID");
	}

	// calculate change amount
	let changeAmt = 0;
	let totalTsatIn = 0;
	let totalTsatOut = 0;
	const totalAmtNeeded = distributions.reduce(
		(acc, dist) => acc + toTokenSat(dist.tokens, decimals),
		0,
	);

	const modelOrFee = new SatoshisPerKilobyte(satsPerKb);
	let tx = new Transaction();

	// Handle token inputs based on tokenInputMode
	let tokensToUse: TokenUtxo[];
	if (tokenInputMode === TokenInputMode.All) {
		tokensToUse = inputTokens;
		totalTsatIn = inputTokens.reduce(
			(acc, token) => acc + Number(token.amt),
			0,
		);
	} else {
		tokensToUse = [];
		for (const token of inputTokens) {
			tokensToUse.push(token);
			totalTsatIn += Number(token.amt);
			if (totalTsatIn >= totalAmtNeeded) {
				break;
			}
		}
		if (totalTsatIn < totalAmtNeeded) {
			throw new Error("Not enough tokens to satisfy the transfer amount");
		}
	}

	for (const token of tokensToUse) {
		const inputScriptBinary = Utils.toArray(token.script, "base64");
		const inputScript = Script.fromBinary(inputScriptBinary);
		tx.addInput(
			inputFromB64Utxo(
				token,
				new OrdP2PKH().unlock(ordPk, "all", true, token.satoshis, inputScript),
			),
		);
	}

	// remove any undefined fields from metadata
	if (metaData) {
		for (const key of Object.keys(metaData)) {
			if (metaData[key] === undefined) {
				delete metaData[key];
			}
		}
	}

	// build destination inscriptions
	for (const dest of distributions) {
		const bigAmt = toTokenSat(dest.tokens, decimals);
		const transferInscription: TransferTokenInscription = {
			p: "bsv-20",
			op: burn ? "burn" : "transfer",
			amt: bigAmt.toString(),
		};
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

		tx.addOutput({
			satoshis: 1,
			lockingScript: new OrdP2PKH().lock(
				dest.address,
				{
					dataB64: Buffer.from(JSON.stringify(inscription)).toString("base64"),
					contentType: "application/bsv-20",
				},
				// when present, include metadata on each distribution if omit is not specified
				dest.omitMetaData ? undefined : stringifyMetaData(metaData),
			),
		});
		totalTsatOut += bigAmt;
	}

	changeAmt = totalTsatIn - totalTsatOut;
	console.log({ changeAmt, totalTsatIn, totalTsatOut });
	// check that you have enough tokens to send and return change
	if (changeAmt < 0n) {
		throw new Error("Not enough tokens to send");
	}

	let tokenChange: TokenUtxo[] = [];
	if (changeAmt > 0n) {
		tokenChange = splitChangeOutputs(
			tx,
			changeAmt,
			protocol,
			tokenID,
			tokenChangeAddress || ordPk.toAddress().toString(),
			ordPk,
			metaData,
			splitConfig,
		);
	}
	// if (changeAmt > 0n) {
	//   tokenChange = splitChangeOutputs(
	//     tx,
	//     inputTokens.length,
	//     changeAmt,
	//     protocol,
	//     tokenID,
	//     tokenChangeAddress || ordPk.toAddress().toString(),
	//     ordPk,
	//     metaData,
	//     splitConfig,
	//   );
	// }

	// Add additional payments if any
	for (const p of additionalPayments) {
		tx.addOutput({
			satoshis: p.amount,
			lockingScript: new P2PKH().lock(p.to),
		});
	}

	// add change to the outputs
	let payChange: Utxo | undefined;

	const change = changeAddress || paymentPk.toAddress().toString();
	const changeScript = new P2PKH().lock(change);
	const changeOut = {
		lockingScript: changeScript,
		change: true,
	};
	tx.addOutput(changeOut);

	let totalSatsIn = 0n;
	const totalSatsOut = tx.outputs.reduce(
		(total, out) => total + BigInt(out.satoshis || 0),
		0n,
	);
	let fee = 0;
	for (const utxo of utxos) {
		const input = inputFromB64Utxo(
			utxo,
			new P2PKH().unlock(
				paymentPk,
				"all",
				true,
				utxo.satoshis,
				Script.fromBinary(Utils.toArray(utxo.script, "base64")),
			),
		);

		tx.addInput(input);
		// stop adding inputs if the total amount is enough
		totalSatsIn += BigInt(utxo.satoshis);
		fee = await modelOrFee.computeFee(tx);

		if (totalSatsIn >= totalSatsOut + BigInt(fee)) {
			break;
		}
	}

	// make sure we have enough
	if (totalSatsIn < totalSatsOut + BigInt(fee)) {
		throw new Error(
			`Not enough funds to transfer tokens. Total sats in: ${totalSatsIn}, Total sats out: ${totalSatsOut}, Fee: ${fee}`,
		);
	}

	if (signer) {
		tx = await signData(tx, signer);
	}

	// estimate the cost of the transaction and assign change value
	await tx.fee(modelOrFee);

	// Sign the transaction
	await tx.sign();

	// assign txid to tokenChange outputs
	const txid = tx.id("hex") as string;
	for (const change of tokenChange) {
		change.txid = txid;
	}

	// check for change
	const payChangeOutIdx = tx.outputs.findIndex((o) => o.change);
	if (payChangeOutIdx !== -1) {
		const changeOutput = tx.outputs[payChangeOutIdx];
		payChange = {
			satoshis: changeOutput.satoshis as number,
			txid,
			vout: payChangeOutIdx,
			script: Buffer.from(changeOutput.lockingScript.toBinary()).toString(
				"base64",
			),
		};
	}

	if (payChange) {
		const changeOutput = tx.outputs[tx.outputs.length - 1];
		payChange.satoshis = changeOutput.satoshis as number;
		payChange.txid = tx.id("hex") as string;
	}

	return {
		tx,
		spentOutpoints: tx.inputs.map(
			(i) => `${i.sourceTXID}_${i.sourceOutputIndex}`,
		),
		payChange,
		tokenChange,
	};
};

// const splitChangeOutputs = (
//   tx: Transaction,
//   numTokenInputs: number,
//   changeAmt: bigint,
//   protocol: TokenType,
//   tokenID: string,
//   tokenChangeAddress: string,
//   ordPk: PrivateKey,
//   metaData: PreMAP | undefined,
//   splitConfig: TokenSplitConfig
// ): TokenUtxo[] => {
//   const tokenChanges: TokenUtxo[] = [];
//   const shouldSplit = splitConfig.threshold === undefined || numTokenInputs <= BigInt(splitConfig.threshold);
//   const splitOutputs = shouldSplit ? splitConfig.outputs : 1;
//   const baseChangeAmount = changeAmt / BigInt(splitOutputs);
//   let remainder = changeAmt % BigInt(splitOutputs);

//   for (let i = 0; i < splitOutputs; i++) {
//     let splitAmount = baseChangeAmount;
//     if (remainder > 0n) {
//       splitAmount += 1n;
//       remainder -= 1n;
//     }

//     const transferInscription: TransferTokenInscription = {
//       p: "bsv-20",
//       op: "transfer",
//       amt: splitAmount.toString(),
//     };
//     let inscription: TransferBSV20Inscription | TransferBSV21Inscription;
//     if (protocol === TokenType.BSV20) {
//       inscription = {
//         ...transferInscription,
//         tick: tokenID,
//       } as TransferBSV20Inscription;
//     } else if (protocol === TokenType.BSV21) {
//       inscription = {
//         ...transferInscription,
//         id: tokenID,
//       } as TransferBSV21Inscription;
//     } else {
//       throw new Error("Invalid protocol");
//     }

//     const lockingScript = new OrdP2PKH().lock(
//       tokenChangeAddress || ordPk.toAddress().toString(),
//       {
//         dataB64: Buffer.from(JSON.stringify(inscription)).toString('base64'),
//         contentType: "application/bsv-20",
//       },
//       splitConfig.omitMetaData ? undefined : stringifyMetaData(metaData)
//     );

//     const vout = tx.outputs.length;
//     tx.addOutput({ lockingScript, satoshis: 1 });
//     tokenChanges.push({
//       id: tokenID,
//       satoshis: 1,
//       script: Buffer.from(lockingScript.toBinary()).toString("base64"),
//       txid: "",
//       vout,
//       amt: splitAmount.toString(),
//     });
//   }

//   return tokenChanges;
// }

const splitChangeOutputs = (
	tx: Transaction,
	changeAmt: number,
	protocol: TokenType,
	tokenID: string,
	tokenChangeAddress: string,
	ordPk: PrivateKey,
	metaData: PreMAP | undefined,
	splitConfig: TokenSplitConfig,
): TokenUtxo[] => {
	const tokenChanges: TokenUtxo[] = [];
	const threshold = splitConfig.threshold || 0;
	const maxOutputs = splitConfig.outputs;

	let splitOutputs = 1;
	if (threshold > 0) {
		splitOutputs = changeAmt / threshold;
		splitOutputs = Math.min(splitOutputs, maxOutputs);
		splitOutputs = Math.max(splitOutputs, 1);
	}

	const baseChangeAmount = changeAmt / splitOutputs;
	let remainder = changeAmt % splitOutputs;

	for (let i = 0; i < splitOutputs; i++) {
		let splitAmount = baseChangeAmount;
		if (remainder > 0n) {
			splitAmount += 1;
			remainder -= 1;
		}

		const transferInscription: TransferTokenInscription = {
			p: "bsv-20",
			op: "transfer",
			amt: splitAmount.toString(),
		};
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

		const lockingScript = new OrdP2PKH().lock(
			tokenChangeAddress || ordPk.toAddress().toString(),
			{
				dataB64: Buffer.from(JSON.stringify(inscription)).toString("base64"),
				contentType: "application/bsv-20",
			},
			splitConfig.omitMetaData ? undefined : stringifyMetaData(metaData),
		);

		const vout = tx.outputs.length;
		tx.addOutput({ lockingScript, satoshis: 1 });
		tokenChanges.push({
			id: tokenID,
			satoshis: 1,
			script: Buffer.from(lockingScript.toBinary()).toString("base64"),
			txid: "",
			vout,
			amt: splitAmount.toString(),
		});
	}

	return tokenChanges;
};
