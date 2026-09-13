import { OrdLockV2 } from "@1sat/templates";
import {
	P2PKH,
	SatoshisPerKilobyte,
	Script,
	Transaction,
	Utils,
} from "@bsv/sdk";
import { ReturnTypes, toTokenSat } from "satoshi-token";
import { DEFAULT_SAT_PER_KB } from "./constants";
import { signData } from "./signData";
import OrdP2PKH, { inscriptionEnvelope } from "./templates/ordP2pkh";
import {
	type ChangeResult,
	type CreateOrdListingsConfig,
	type CreateOrdTokenListingsConfig,
	type Inscription,
	type TokenChangeResult,
	TokenType,
	type TokenUtxo,
	type TransferBSV20Inscription,
	type TransferBSV21Inscription,
	type TransferTokenInscription,
	type Utxo,
} from "./types";
import { inputFromB64Utxo } from "./utils/utxo";
const { toArray } = Utils;

/**
 * Builds an OrdLock v2 listing script, optionally prefixed with an inscription
 * envelope (token listings carry their transfer inscription this way, exactly
 * as v1 listings did). Bytes are concatenated rather than re-parsed so the
 * compiled contract is preserved verbatim.
 */
export const listingLockingScript = (
	ordAddress: string,
	payAddress: string,
	price: number,
	inscription?: Inscription,
): Script => {
	const lock = OrdLockV2.lock(ordAddress, payAddress, price);
	if (!inscription) return lock;
	const envelope = inscriptionEnvelope(inscription);
	return Script.fromBinary([...envelope.toBinary(), ...lock.toBinary()]);
};

/**
 * Create Ordinal Listings using the OrdLock v2 contract.
 * @param {CreateOrdListingsConfig} config - Configuration object for creating listings
 * @param {Utxo[]} config.utxos - Utxos to spend (with base64 encoded scripts)
 * @param {NewListing[]} config.listings - Listings to create (ordinal utxo, price, pay address, cancel address)
 * @param {PrivateKey} config.paymentPk - Private key to sign payment inputs
 * @param {PrivateKey} config.ordPk - Private key to sign the listed ordinals
 * @param {string} [config.changeAddress] - Optional. Address to send change to
 * @param {number} [config.satsPerKb] - Optional. Satoshis per kilobyte for fee calculation
 * @param {Payment[]} [config.additionalPayments] - Optional. Additional payments to make
 * @param {LocalSigner | RemoteSigner} [config.signer] - Optional. Sigma signer
 * @param {boolean} [config.signInputs] - Optional. When false, inputs are added unsigned. Default: true
 * @returns {Promise<ChangeResult>} Transaction, spent outpoints, change utxo
 */
export const createOrdListings = async (
	config: CreateOrdListingsConfig,
): Promise<ChangeResult> => {
	const {
		utxos,
		listings,
		paymentPk,
		ordPk,
		satsPerKb = DEFAULT_SAT_PER_KB,
		additionalPayments = [],
		signer,
		signInputs = true,
	} = config;

	const modelOrFee = new SatoshisPerKilobyte(satsPerKb);
	let tx = new Transaction();

	// Warn if creating many listings at once
	if (listings.length > 100) {
		console.warn(
			"Creating many listings at once can be slow. Consider using multiple transactions instead.",
		);
	}

	// Outputs
	// Add listing outputs
	for (const listing of listings) {
		tx.addOutput({
			satoshis: 1,
			lockingScript: listingLockingScript(
				listing.ordAddress,
				listing.payAddress,
				listing.price,
			),
		});

		if (signInputs) {
			const inputScript = Script.fromBinary(
				toArray(listing.listingUtxo.script, "base64"),
			);
			const ordKeyToUse = listing.listingUtxo.pk || ordPk;
			if (!ordKeyToUse) {
				throw new Error("Private key is required to sign the ordinal");
			}
			tx.addInput(
				inputFromB64Utxo(
					listing.listingUtxo,
					new OrdP2PKH().unlock(
						ordKeyToUse,
						"all",
						true,
						listing.listingUtxo.satoshis,
						inputScript,
					),
				),
			);
		} else {
			tx.addInput(inputFromB64Utxo(listing.listingUtxo));
		}
	}

	// Add additional payments if any
	for (const p of additionalPayments) {
		tx.addOutput({
			satoshis: p.amount,
			lockingScript: new P2PKH().lock(p.to),
		});
	}

	// Check if change is needed
	let payChange: Utxo | undefined;
	const changeAddress = config.changeAddress || paymentPk?.toAddress();
	if (!changeAddress) {
		throw new Error("changeAddress or private key is required");
	}
	const changeScript = new P2PKH().lock(changeAddress);
	const changeOutput = {
		lockingScript: changeScript,
		change: true,
	};
	tx.addOutput(changeOutput);

	let totalSatsIn = 0n;
	const totalSatsOut = tx.outputs.reduce(
		(total, out) => total + BigInt(out.satoshis || 0),
		0n,
	);
	let fee = 0;
	for (const utxo of utxos) {
		if (signInputs) {
			const payKeyToUse = utxo.pk || paymentPk;
			if (!payKeyToUse) {
				throw new Error("Private key is required to sign the transaction");
			}
			const input = inputFromB64Utxo(
				utxo,
				new P2PKH().unlock(
					payKeyToUse,
					"all",
					true,
					utxo.satoshis,
					Script.fromBinary(Utils.toArray(utxo.script, "base64")),
				),
			);
			tx.addInput(input);
		} else {
			tx.addInput(inputFromB64Utxo(utxo));
		}
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
			`Not enough funds to create ordinal listings. Total sats in: ${totalSatsIn}, Total sats out: ${totalSatsOut}, Fee: ${fee}`,
		);
	}

	if (signer) {
		tx = await signData(tx, signer);
	}

	// Calculate fee
	await tx.fee(modelOrFee);

	// Sign the transaction (if signInputs is true)
	if (signInputs) {
		await tx.sign();
	}

	// check for change
	const payChangeOutIdx = tx.outputs.findIndex((o) => o.change);
	if (payChangeOutIdx !== -1) {
		const changeOutput = tx.outputs[payChangeOutIdx];
		payChange = {
			satoshis: changeOutput.satoshis as number,
			txid: tx.id("hex") as string,
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
	};
};

/**
 * Create token listings (BSV20 / BSV21) using the OrdLock v2 contract. Each
 * listing output carries a transfer inscription for the listed amount ahead of
 * the contract.
 * @param {CreateOrdTokenListingsConfig} config - Configuration object for creating token listings
 * @returns {Promise<TokenChangeResult>} Transaction, spent outpoints, change utxo, token change utxos
 */
export const createOrdTokenListings = async (
	config: CreateOrdTokenListingsConfig,
): Promise<TokenChangeResult> => {
	const {
		utxos,
		protocol,
		tokenID,
		ordPk,
		paymentPk,
		additionalPayments = [],
		tokenChangeAddress,
		inputTokens,
		listings,
		decimals,
		satsPerKb = DEFAULT_SAT_PER_KB,
		signer,
		signInputs = true,
	} = config;

	// Warn if creating many listings at once
	if (listings.length > 100) {
		console.warn(
			"Creating many listings at once can be slow. Consider using multiple transactions instead.",
		);
	}

	// Ensure these inputs are for the expected token
	if (!inputTokens.every((token) => token.id === tokenID)) {
		throw new Error("Input tokens do not match the provided tokenID");
	}

	// calculate change amount
	let changeAmt = 0n;
	let totalAmtIn = 0n;
	let totalAmtOut = 0n;

	const modelOrFee = new SatoshisPerKilobyte(satsPerKb);
	let tx = new Transaction();
	// Outputs
	// Add listing outputs
	for (const listing of listings) {
		// NewTokenListing is not adjusted for decimals
		const bigAmt = toTokenSat(listing.tokens, decimals, ReturnTypes.BigInt);
		const transferInscription: TransferTokenInscription = {
			p: "bsv-20",
			op: "transfer",
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
			lockingScript: listingLockingScript(
				listing.ordAddress,
				listing.payAddress,
				listing.price,
				{
					dataB64: Buffer.from(JSON.stringify(inscription)).toString("base64"),
					contentType: "application/bsv-20",
				},
			),
		});
		totalAmtOut += bigAmt;
	}

	// Input tokens are already adjusted for decimals
	for (const token of inputTokens) {
		if (signInputs) {
			const ordKeyToUse = token.pk || ordPk;
			if (!ordKeyToUse) {
				throw new Error("Private key is required to sign the ordinal");
			}
			tx.addInput(
				inputFromB64Utxo(
					token,
					new OrdP2PKH().unlock(
						ordKeyToUse,
						"all",
						true,
						token.satoshis,
						Script.fromBinary(toArray(token.script, "base64")),
					),
				),
			);
		} else {
			tx.addInput(inputFromB64Utxo(token));
		}
		totalAmtIn += BigInt(token.amt);
	}
	changeAmt = totalAmtIn - totalAmtOut;

	let tokenChange: TokenUtxo[] | undefined;
	// check that you have enough tokens to send and return change
	if (changeAmt < 0n) {
		throw new Error("Not enough tokens to send");
	}
	if (changeAmt > 0n) {
		const transferInscription: TransferTokenInscription = {
			p: "bsv-20",
			op: "transfer",
			amt: changeAmt.toString(),
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

		const lockingScript = new OrdP2PKH().lock(tokenChangeAddress, {
			dataB64: Buffer.from(JSON.stringify(inscription)).toString("base64"),
			contentType: "application/bsv-20",
		});
		const vout = tx.outputs.length;
		tx.addOutput({ lockingScript, satoshis: 1 });
		tokenChange = [
			{
				id: tokenID,
				satoshis: 1,
				script: Buffer.from(lockingScript.toBinary()).toString("base64"),
				txid: "",
				vout,
				amt: changeAmt.toString(),
			},
		];
	}

	// Add additional payments if any
	for (const p of additionalPayments) {
		tx.addOutput({
			satoshis: p.amount,
			lockingScript: new P2PKH().lock(p.to),
		});
	}

	// add change to the outputs
	let payChange: Utxo | undefined;
	const changeAddress = config.changeAddress || paymentPk?.toAddress();
	if (!changeAddress) {
		throw new Error("Either changeAddress or paymentPk is required");
	}

	const changeScript = new P2PKH().lock(changeAddress);
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
		if (signInputs) {
			const payKeyToUse = utxo.pk || paymentPk;
			if (!payKeyToUse) {
				throw new Error("Private key is required to sign the payment");
			}
			const input = inputFromB64Utxo(
				utxo,
				new P2PKH().unlock(
					payKeyToUse,
					"all",
					true,
					utxo.satoshis,
					Script.fromBinary(Utils.toArray(utxo.script, "base64")),
				),
			);
			tx.addInput(input);
		} else {
			tx.addInput(inputFromB64Utxo(utxo));
		}
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
			`Not enough funds to create token listings. Total sats in: ${totalSatsIn}, Total sats out: ${totalSatsOut}, Fee: ${fee}`,
		);
	}

	if (signer) {
		tx = await signData(tx, signer);
	}

	// estimate the cost of the transaction and assign change value
	await tx.fee(modelOrFee);

	// Sign the transaction (if signInputs is true)
	if (signInputs) {
		await tx.sign();
	}

	const txid = tx.id("hex") as string;
	if (tokenChange) {
		tokenChange = tokenChange.map((tc) => ({ ...tc, txid }));
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
