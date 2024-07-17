import { Transaction, SatoshisPerKilobyte, P2PKH } from "@bsv/sdk";
import OrdP2PKH from "./templates/ordP2pkh";
import type {
	Utxo,
	CreateOrdinalsConfig,
	CreateOrdinalsResult,
	CreateOrdinalsCollectionConfig,
	CreateOrdinalsCollectionItemConfig,
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
 * @returns {Promise<CreateOrdinalsResult>} Transaction with inscription outputs
 */
export const createOrdinals = async (
	config:
		| CreateOrdinalsConfig
		| CreateOrdinalsCollectionConfig
		| CreateOrdinalsCollectionItemConfig,
): Promise<CreateOrdinalsResult> => {
	const {
		utxos,
		destinations,
		paymentPk,
		changeAddress,
		satsPerKb = DEFAULT_SAT_PER_KB,
		metaData,
		signer,
		additionalPayments = [],
	} = config;

	const modelOrFee = new SatoshisPerKilobyte(satsPerKb);
	let tx = new Transaction();

	// Inputs
	for (const utxo of utxos) {
		const input = inputFromB64Utxo(utxo, new P2PKH().unlock(paymentPk));
		tx.addInput(input);
	}

	// Warn if creating many inscriptions at once
	if (destinations.length > 100) {
		console.warn(
			"Creating many inscriptions at once can be slow. Consider using multiple transactions instead.",
		);
	}

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
				destination.inscription.dataB64,
				destination.inscription.contentType,
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

	// Calculate total input and output amounts
	const totalInput = utxos.reduce(
		(sum, utxo) => sum + BigInt(utxo.satoshis),
		0n,
	);
	const totalOutput = tx.outputs.reduce(
		(sum, output) => sum + BigInt(output.satoshis || 0),
		0n,
	);

	// Estimate fee
	const estimatedFee = await modelOrFee.computeFee(tx);

	// Check if change is needed
	let payChange: Utxo | undefined;
	if (totalInput > totalOutput + BigInt(estimatedFee)) {
		const changeScript = new P2PKH().lock(
			changeAddress || paymentPk.toAddress().toString(),
		);
		const changeOutput = {
			lockingScript: changeScript,
			change: true,
		};
		// Add change output
		payChange = {
			txid: "", // txid is not known yet,
			vout: tx.outputs.length,
			satoshis: 0, // change output amount is not known yet
			script: Buffer.from(changeScript.toHex(), "hex").toString("base64"),
		};

		tx.addOutput(changeOutput);
	}

	if (signer) {
		tx = await signData(tx, signer);
	}

	// Calculate fee
	await tx.fee(modelOrFee);

	// Sign the transaction
	await tx.sign();

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
