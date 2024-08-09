import {
	Transaction,
	P2PKH,
	SatoshisPerKilobyte,
	type TransactionOutput,
	Utils,
	Script,
} from "@bsv/sdk";
import type {
  ChangeResult,
	DeployBsv21TokenConfig,
	DeployMintTokenInscription,
	Inscription,
	Utxo,
} from "./types";
import { inputFromB64Utxo } from "./utils/utxo";
import { validIconData, validIconFormat } from "./utils/icon";
import OrdP2PKH from "./templates/ordP2pkh";
import { DEFAULT_SAT_PER_KB } from "./constants";

/**
 * Deploys & Mints a BSV21 token to the given destination address
 * @param {DeployBsv21TokenConfig} config - Configuration object for deploying BSV21 token
 * @param {string} config.symbol - Token ticker symbol
 * @param {number} config.decimals - Number of decimal places to display
 * @param {string | IconInscription} config.icon - outpoint (format: txid_vout) or Inscription. If Inscription, must be a valid image type
 * @param {Utxo[]} config.utxos - Payment Utxos available to spend. Will only consume what is needed.
 * @param {Distribution} config.initialDistribution - Initial distribution with addresses and total supply (not adjusted for decimals, library will add zeros)
 * @param {PrivateKey} config.paymentPk - Private key to sign paymentUtxos
 * @param {string} config.destinationAddress - Address to deploy token to.
 * @param {string} [config.changeAddress] - Optional. Address to send payment change to, if any. If not provided, defaults to paymentPk address
 * @param {number} [config.satsPerKb] - Optional. Satoshis per kilobyte for fee calculation. Default is DEFAULT_SAT_PER_KB
 * @param {Payment[]} [config.additionalPayments] - Optional. Additional payments to include in the transaction
 * @returns {Promise<ChangeResult>} Transaction to deploy BSV 2.1 token
 */
export const deployBsv21Token = async (
	config: DeployBsv21TokenConfig,
): Promise<ChangeResult> => {
	const {
		symbol,
		icon,
    decimals,
		utxos,
		initialDistribution,
		paymentPk,
		destinationAddress,
		changeAddress,
		satsPerKb = DEFAULT_SAT_PER_KB,
		additionalPayments = [],
	} = config;

	const modelOrFee = new SatoshisPerKilobyte(satsPerKb);

	const tx = new Transaction();

	let iconValue: string;
	if (typeof icon === "string") {
		iconValue = icon;
	} else {
		const iconError = await validIconData(icon);
		if (iconError) {
			throw iconError;
		}
		// add icon inscription to the transaction
		const iconScript = new OrdP2PKH().lock(destinationAddress, icon);
		const iconOut = {
			satoshis: 1,
			lockingScript: iconScript,
		};
		tx.addOutput(iconOut);
		// relative output index of the icon
		iconValue = "_0";
	}

	// Ensure the icon format
	if (!validIconFormat(iconValue)) {
		throw new Error(
			"Invalid icon format. Must be either outpoint (format: txid_vout) or relative output index of the icon (format _vout). examples: ecb483eda58f26da1b1f8f15b782b1186abdf9c6399a1c3e63e0d429d5092a41_0 or _1",
		);
	}
  
	// Outputs
  const amt = decimals ? BigInt(initialDistribution.amt) * 10n ** BigInt(decimals) : BigInt(initialDistribution.amt);
	const fileData: DeployMintTokenInscription = {
		p: "bsv-20",
		op: "deploy+mint",
		sym: symbol,
		icon: iconValue,
		amt: amt.toString(),
	};

  if (decimals) {
    fileData.dec = decimals.toString();
  }

	const b64File = Buffer.from(JSON.stringify(fileData)).toString("base64");
	const sendTxOut = {
		satoshis: 1,
		lockingScript: new OrdP2PKH().lock(destinationAddress, {
			dataB64: b64File,
			contentType: "application/bsv-20",
		} as Inscription),
	};
	tx.addOutput(sendTxOut);

	// Additional payments
	for (const payment of additionalPayments) {
		const sendTxOut: TransactionOutput = {
			satoshis: payment.amount,
			lockingScript: new P2PKH().lock(payment.to),
		};
		tx.addOutput(sendTxOut);
	}

	// Inputs
	let totalSatsIn = 0n;
	const totalSatsOut = tx.outputs.reduce(
		(total, out) => total + BigInt(out.satoshis || 0),
		0n,
	);
	let fee = 0;
	for (const utxo of utxos) {
		const input = inputFromB64Utxo(utxo, new P2PKH().unlock(
			paymentPk, 
			"all",
			true, 
			utxo.satoshis,
			Script.fromBinary(Utils.toArray(utxo.script, 'base64'))
		));
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
			`Not enough funds to deploy token. Total sats in: ${totalSatsIn}, Total sats out: ${totalSatsOut}, Fee: ${fee}`,
		);
	}

	// if we need to send change, add it to the outputs
	let payChange: Utxo | undefined;

	const change = changeAddress || paymentPk.toAddress().toString();
	const changeScript = new P2PKH().lock(change);
	const changeOut = {
		lockingScript: changeScript,
		change: true,
	};
	tx.addOutput(changeOut);

	// estimate the cost of the transaction and assign change value
	await tx.fee(modelOrFee);

	// Sign the transaction
	await tx.sign();

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

	return {
		tx,
		spentOutpoints: tx.inputs.map(
			(i) => `${i.sourceTXID}_${i.sourceOutputIndex}`,
		),
		payChange,
	};
};
