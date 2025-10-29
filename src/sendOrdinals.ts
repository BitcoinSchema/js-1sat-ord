import {
	Transaction,
	SatoshisPerKilobyte,
	P2PKH,
	Script,
	Utils,
} from "@bsv/sdk";
import { DEFAULT_SAT_PER_KB } from "./constants";
import OrdP2PKH from "./templates/ordP2pkh";
import type { SendOrdinalsConfig, Utxo, ChangeResult } from "./types";
import { inputFromB64Utxo } from "./utils/utxo";
import { signData } from "./signData";
import stringifyMetaData from "./utils/subtypeData";
import MAP from "@bsv/templates/template/bitcom/MAP.ts";

/**
 * Sends ordinals to the given destinations
 * @param {SendOrdinalsConfig} config - Configuration object for sending ordinals
 * @param {Utxo[]} config.paymentUtxos - Utxos to spend (with base64 encoded scripts)
 * @param {Utxo[]} config.ordinals - Utxos to spend (with base64 encoded scripts)
 * @param {PrivateKey} config.paymentPk - Private key to sign paymentUtxos
 * @param {PrivateKey} config.ordPk - Private key to sign ordinals
 * @param {Destination[]} config.destinations - Array of destinations with addresses and inscriptions
 * @param {string} [config.changeAddress] - Optional. Address to send change to, if any. If not provided, defaults to paymentPk address
 * @param {number} [config.satsPerKb] - Optional. Satoshis per kilobyte for fee calculation. Default is DEFAULT_SAT_PER_KB
 * @param {PreMAP} [config.metaData] - Optional. MAP (Magic Attribute Protocol) metadata to include in inscriptions
 * @param {LocalSigner | RemoteSigner} [config.signer] - Optional. Signer object to sign the transaction
 * @param {Payment[]} [config.additionalPayments] - Optional. Additional payments to include in the transaction
 * @param {boolean} [config.enforceUniformSend] - Optional. Default: true. Enforce that the number of destinations matches the number of ordinals being sent. Sending ordinals requires a 1:1 mapping of destinations to ordinals. This is only used for sub-protocols like BSV21 that manage tokens without sending the inscriptions directly.
 * @returns {Promise<ChangeResult>} Transaction, spent outpoints, and change utxo
 */
export const sendOrdinals = async (
	config: SendOrdinalsConfig,
): Promise<ChangeResult> => {
	if (!config.satsPerKb) {
		config.satsPerKb = DEFAULT_SAT_PER_KB;
	}
	if (!config.additionalPayments) {
		config.additionalPayments = [];
	}
	if (config.enforceUniformSend === undefined) {
		config.enforceUniformSend = true;
	}

	const {ordPk, paymentPk} = config;

	const modelOrFee = new SatoshisPerKilobyte(config.satsPerKb);
	let tx = new Transaction();
	const spentOutpoints: string[] = [];

	// Inputs
	// Add ordinal inputs
	for (const ordUtxo of config.ordinals) {
    const ordKeyToUse = ordUtxo.pk || ordPk;
		if (!ordKeyToUse) {
			throw new Error("Private key is required to sign the ordinal");
		}
		if (ordUtxo.satoshis !== 1) {
			throw new Error("1Sat Ordinal utxos must have exactly 1 satoshi");
		}

		const input = inputFromB64Utxo(
			ordUtxo,
			new OrdP2PKH().unlock(
				ordKeyToUse, 
				"all",
				true, 
				ordUtxo.satoshis,
				Script.fromBinary(Utils.toArray(ordUtxo.script, 'base64'))
			),
		);
		spentOutpoints.push(`${ordUtxo.txid}_${ordUtxo.vout}`);
		tx.addInput(input);
	}

	// Outputs
	// check that ordinals coming in matches ordinals going out if supplied
	if (
		config.enforceUniformSend &&
		config.destinations.length !== config.ordinals.length
	) {
		throw new Error(
			"Number of destinations must match number of ordinals being sent",
		);
	}

	// Add ordinal outputs
	for (const destination of config.destinations) {
		let s: Script;
		if (
			destination.inscription?.dataB64 &&
			destination.inscription?.contentType
		) {
			s = new OrdP2PKH().lock(
				destination.address,
				destination.inscription,
				stringifyMetaData(config.metaData),
			);
		} else {
			s = new P2PKH().lock(destination.address);

			if (config.metaData) {
				const data = {} as Record<string, string>;
				for (const key in config.metaData) {
					data[key] = (config.metaData[key] as any).toString();
				}
				s = new Script([
					...s.chunks,
					...MAP.lock("SET", data).chunks,
				])
			}
		}

		tx.addOutput({
			satoshis: 1,
			lockingScript: s,
		});
	}

  
	// Add additional payments if any
	for (const p of config.additionalPayments) {
		tx.addOutput({
			satoshis: p.amount,
			lockingScript: new P2PKH().lock(p.to),
		});
	}

  // add change to the outputs
	let payChange: Utxo | undefined;

  const changeAddress = config.changeAddress || paymentPk?.toAddress();
	if(!changeAddress) {
		throw new Error("Either changeAddress or paymentPk is required");
	}
	const changeScript = new P2PKH().lock(changeAddress);
	const changeOut = {
		lockingScript: changeScript,
		change: true,
	};
	tx.addOutput(changeOut);

	// Inputs
	let totalSatsIn = 0n;
	const totalSatsOut = tx.outputs.reduce(
		(total, out) => total + BigInt(out.satoshis || 0),
		0n,
	);
	let fee = 0;
	for (const utxo of config.paymentUtxos) {
    const payKeyToUse = utxo.pk || paymentPk;
		if (!payKeyToUse) {
			throw new Error("Private key is required to sign the payment");
		}
		const input = inputFromB64Utxo(utxo, new P2PKH().unlock(
			payKeyToUse, 
			"all",
			true, 
			utxo.satoshis,
			Script.fromBinary(Utils.toArray(utxo.script, 'base64'))
		));
		spentOutpoints.push(`${utxo.txid}_${utxo.vout}`);

		tx.addInput(input);
		// stop adding inputs if the total amount is enough
		totalSatsIn += BigInt(utxo.satoshis);
		fee = await modelOrFee.computeFee(tx);

		if (totalSatsIn >= totalSatsOut + BigInt(fee)) {
			break;
		}
	}

	if (totalSatsIn < totalSatsOut) {
		throw new Error("Not enough ordinals to send");
	}

	if (config.signer) {
		tx = await signData(tx, config.signer);
	}

	// Calculate fee
	await tx.fee(modelOrFee);

	// Sign the transaction
	await tx.sign();

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
		spentOutpoints,
		payChange,
	};
};
