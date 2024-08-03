import {
	LockingScript,
	P2PKH,
	type Script,
} from "@bsv/sdk";
import type { Inscription, MAP } from "../types";
import { toHex } from "../utils/strings";
import { MAP_PREFIX } from "../constants";

/**
 * OrdP2PKH (1Sat Ordinal + Pay To Public Key Hash) class implementing ScriptTemplate.
 *
 * This class provides methods to create an Ordinal with Pay To Public Key Hash locking and unlocking scripts. 
 * It extends the standard P2PKH script template and provides a custom lock method.
 */
export default class OrdP2PKH extends P2PKH {
	/**
	 * Creates a 1Sat Ordinal + P2PKH locking script for a given address string
	 *
	 * @param {string} address - An destination address for the Ordinal.
	 * @param {Object} [inscription] - Base64 encoded file data and Content type of the file.
	 * @param {MAP} [metaData] - (optional) MAP Metadata to be included in OP_RETURN.
	 * @returns {LockingScript} - A P2PKH locking script.
	 */
	// unlock method inherits from p2pkh
	lock(
		address: string,
    inscription?: Inscription,
		metaData?: MAP | undefined,
	): Script {
		let ordAsm = "";
		// This can be omitted for reinscriptions that just update metadata
		if (inscription?.dataB64 !== undefined && inscription?.contentType !== undefined) {
			const ordHex = toHex("ord");
			const fsBuffer = Buffer.from(inscription.dataB64, "base64");
			const fileHex = fsBuffer.toString("hex").trim();
			if (!fileHex) {
				throw new Error("Invalid file data");
			}
			const fileMediaType = toHex(inscription.contentType);
			if (!fileMediaType) {
				throw new Error("Invalid media type");
			}
			ordAsm = `OP_0 OP_IF ${ordHex} OP_1 ${fileMediaType} OP_0 ${fileHex} OP_ENDIF`;
		}

		// Create ordinal output and inscription in a single output
		const lockingScript = new P2PKH().lock(address);
		let inscriptionAsm = `${ordAsm ? `${ordAsm} ` : ""}${lockingScript.toASM()}`;

		// MAP.app and MAP.type keys are required
		if (metaData && (!metaData.app || !metaData.type)) {
			throw new Error("MAP.app and MAP.type are required fields");
		}

		if (metaData?.app && metaData?.type) {
			const mapPrefixHex = toHex(MAP_PREFIX);
			const mapCmdValue = toHex("SET");
			inscriptionAsm = `${inscriptionAsm} OP_RETURN ${mapPrefixHex} ${mapCmdValue}`;

			for (const [key, value] of Object.entries(metaData)) {
				if (key !== "cmd") {
					inscriptionAsm = `${inscriptionAsm} ${toHex(key)} ${toHex(
						value as string,
					)}`;
				}
			}
		}

		return LockingScript.fromASM(inscriptionAsm);
	}
}
