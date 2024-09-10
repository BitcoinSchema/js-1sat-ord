import {
	Transaction,
	SatoshisPerKilobyte,
	Script,
	Utils,
  PrivateKey,
} from "@bsv/sdk";
import { DEFAULT_SAT_PER_KB, MAP_PREFIX } from "./constants";
import OrdP2PKH from "./templates/ordP2pkh";
import type {
  BaseResult,
	BurnOrdinalsConfig,
} from "./types";
import { inputFromB64Utxo } from "./utils/utxo";
import { toHex } from "./utils/strings";

/**
 * Burn ordinals by consuming them as fees
 * @param {BurnOrdinalsConfig} config - Configuration object for sending ordinals
 * @param {PrivateKey} config.ordPk - Private key to sign ordinals
 * @param {Utxo} config.ordinals - 1Sat Ordinal Utxos to spend (with base64 encoded scripts)
 * @param {BurnMAP} [config.metaData] - Optional. MAP (Magic Attribute Protocol) metadata to include in an unspendable output OP_FALSE OP_RETURN
 * @returns {Promise<BaseResult>} Transaction, spent outpoints
 */
export const burnOrdinals = async (
	config: BurnOrdinalsConfig,
): Promise<BaseResult> => {
	const tx = new Transaction();
	const spentOutpoints: string[] = [];
	const { ordinals, metaData, ordPk } = config;

	// Inputs
	// Add ordinal inputs
	for (const ordUtxo of ordinals) {
		if (ordUtxo.satoshis !== 1) {
			throw new Error("1Sat Ordinal utxos must have exactly 1 satoshi");
		}
		if(!ordPk && !ordUtxo.pk) {
			throw new Error("Private key is required to sign the ordinal");
		}

		const input = inputFromB64Utxo(
			ordUtxo,
			new OrdP2PKH().unlock(
				ordUtxo.pk || ordPk!,
				"all",
				true,
				ordUtxo.satoshis,
				Script.fromBinary(Utils.toArray(ordUtxo.script, "base64")),
			),
		);
		spentOutpoints.push(`${ordUtxo.txid}_${ordUtxo.vout}`);
		tx.addInput(input);
	}

	// Outputs
	// Add metadata output

	// MAP.app and MAP.type keys are required
	if (metaData && (!metaData.app || !metaData.type)) {
		throw new Error("MAP.app and MAP.type are required fields");
	}

	let metaAsm = "";

	if (metaData?.app && metaData?.type) {
		const mapPrefixHex = toHex(MAP_PREFIX);
		const mapCmdValue = toHex("SET");
		metaAsm = `OP_FALSE OP_RETURN ${mapPrefixHex} ${mapCmdValue}`;

		for (const [key, value] of Object.entries(metaData)) {
			if (key !== "cmd") {
				metaAsm = `${metaAsm} ${toHex(key)} ${toHex(value as string)}`;
			}
		}
	}

	tx.addOutput({
		satoshis: 0,
		lockingScript: Script.fromASM(metaAsm || "OP_FALSE OP_RETURN"),
	});

	// Sign the transaction
	await tx.sign();

	return {
		tx,
		spentOutpoints,
	};
};
