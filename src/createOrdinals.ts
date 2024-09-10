import { Transaction, SatoshisPerKilobyte, P2PKH, Script, Utils } from "@bsv/sdk";
import OrdP2PKH from "./templates/ordP2pkh";
import type {
	Utxo,
	CreateOrdinalsConfig,
	CreateOrdinalsCollectionConfig,
	CreateOrdinalsCollectionItemConfig,
  ChangeResult,
} from "./types";
import { inputFromB64Utxo } from "./utils/utxo";
import { DEFAULT_SAT_PER_KB } from "./constants";
import { signData } from "./signData";
import stringifyMetaData from "./utils/subtypeData";

/**
 * Creates a transaction with inscription outputs
 * @param {CreateOrdinalsConfig | CreateOrdinalsCollectionConfig | CreateOrdinalsCollectionItemConfig} config - Configuration object for creating ordinals
 * @param {Utxo[]} config.utxos - Utxos to spend (with base64 encoded scripts)
 * @param {Destination[]} config.destinations - Array of destinations with addresses and inscriptions
 * @param {PrivateKey} config.paymentPk - Private key to sign utxos
 * @param {string} config.changeAddress - Optional. Address to send change to. If not provided, defaults to paymentPk address
 * @param {number} config.satsPerKb - Optional. Satoshis per kilobyte for fee calculation. Default is DEFAULT_SAT_PER_KB
 * @param {PreMAP} config.metaData - Optional. MAP (Magic Attribute Protocol) metadata to include in inscriptions
 * @param {LocalSigner | RemoteSigner} config.signer - Optional. Local or remote signer (used for data signature)
 * @param {Payment[]} config.additionalPayments - Optional. Additional payments to include in the transaction
 * @returns {Promise<ChangeResult>} Transaction with inscription outputs
 */
export const createOrdinals = async (
	config:
		| CreateOrdinalsConfig
		| CreateOrdinalsCollectionConfig
		| CreateOrdinalsCollectionItemConfig,
): Promise<ChangeResult> => {
	const {
		utxos,
		destinations,
		paymentPk,
		satsPerKb = DEFAULT_SAT_PER_KB,
		metaData,
		signer,
		additionalPayments = [],
	} = config;
	
	// Warn if creating many inscriptions at once
	if (destinations.length > 100) {
		console.warn(
			"Creating many inscriptions at once can be slow. Consider using multiple transactions instead.",
		);
	}

	const modelOrFee = new SatoshisPerKilobyte(satsPerKb);
	let tx = new Transaction();

	// Outputs
	// Add inscription outputs
	for (const destination of destinations) {
		if (!destination.inscription) {
			throw new Error("Inscription is required for all destinations");
		}

		// remove any undefined fields from metadata
		if (metaData) {
			for(const key of Object.keys(metaData)) {
				if (metaData[key] === undefined) {
					delete metaData[key];
				}
			}
		}

		tx.addOutput({
			satoshis: 1,
			lockingScript: new OrdP2PKH().lock(
				destination.address,
				destination.inscription,
				stringifyMetaData(metaData),
			),
		});
	}

	// Add additional payments if any
	for (const p of additionalPayments) {
		tx.addOutput({
			satoshis: p.amount,
			lockingScript: new P2PKH().lock(p.to),
		});
	}

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

	let totalSatsIn = 0n;
	const totalSatsOut = tx.outputs.reduce(
		(total, out) => total + BigInt(out.satoshis || 0),
		0n,
	);

	if(signer) {
		const utxo = utxos.pop() as Utxo
    const payKeyToUse = utxo.pk || paymentPk;
		if(!payKeyToUse) {
			throw new Error("Private key is required to sign the transaction");
		}
		tx.addInput(inputFromB64Utxo(utxo, new P2PKH().unlock(
			payKeyToUse, 
			"all",
			true, 
			utxo.satoshis,
			Script.fromBinary(Utils.toArray(utxo.script, 'base64'))
		)));
		totalSatsIn += BigInt(utxo.satoshis);
		tx = await signData(tx, signer);
	}

	let fee = 0;
	for (const utxo of utxos) {
    const payKeyToUse = utxo.pk || paymentPk;
		if(!payKeyToUse) {
			throw new Error("Private key is required to sign the transaction");
		}
		if (totalSatsIn >= totalSatsOut + BigInt(fee)) {
			break;
		}
		const input = inputFromB64Utxo(utxo, new P2PKH().unlock(
			payKeyToUse, 
			"all",
			true, 
			utxo.satoshis,
			Script.fromBinary(Utils.toArray(utxo.script, 'base64'))
		));

		tx.addInput(input);
		// stop adding inputs if the total amount is enough
		totalSatsIn += BigInt(utxo.satoshis);
		fee = await modelOrFee.computeFee(tx);
	}

	// make sure we have enough
	if (totalSatsIn < totalSatsOut + BigInt(fee)) {
		throw new Error(
			`Not enough funds to create ordinals. Total sats in: ${totalSatsIn}, Total sats out: ${totalSatsOut}, Fee: ${fee}`,
		);
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
		spentOutpoints: utxos.map((utxo) => `${utxo.txid}_${utxo.vout}`),
		payChange,
	};
};
