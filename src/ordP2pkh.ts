import {
	LockingScript,
	OP,
	P2PKH,
	PrivateKey,
	type Script,
	Transaction,
	TransactionSignature,
	UnlockingScript,
	type ScriptTemplate,
} from "@bsv/sdk";
import { fromBase58Check } from "@bsv/sdk/dist/types/src/primitives/utils";
import type { MAP } from ".";
import { toHex } from "./utils/strings";

const MAP_PREFIX = "1PuQa7K62MiKCtssSLKy1kh56WWU7MtUR5";

/**
 * OrdP2PKH (1Sat Ordinal + Pay To Public Key Hash) class implementing ScriptTemplate.
 *
 * This class provides methods to create an Ordinal with Pay To Public Key Hash locking and unlocking scripts, including the unlocking of P2PKH UTXOs with the private key.
 */
export default class OrdP2PKH extends P2PKH {
	/**
	 * Creates a P2PKH locking script for a given public key hash or address string
	 *
	 * @param {number[] | string} pubkeyhash or address - An array or address representing the public key hash.
	 * @returns {LockingScript} - A P2PKH locking script.
	 */
	// unlock method inherits from p2pkh
	lock(
		destinationAddress: string,
		b64File?: string | undefined,
		mediaType?: string | undefined,
		metaData?: MAP | undefined,
	): Script {
		let ordAsm = "";
		// This can be omitted for reinscriptions that just update metadata
		if (b64File !== undefined && mediaType !== undefined) {
			const ordHex = toHex("ord");
			const fsBuffer = Buffer.from(b64File, "base64");
			const fileHex = fsBuffer.toString("hex").trim();
			const fileMediaType = toHex(mediaType);
			ordAsm = `OP_0 OP_IF ${ordHex} OP_1 ${fileMediaType} OP_0 ${fileHex ? `${fileHex} ` : ""}OP_ENDIF`;
		}

		// Create ordinal output and inscription in a single output
		const lockingScript = new P2PKH().lock(destinationAddress);
		let inscriptionAsm = `${ordAsm ? `${ordAsm} ` : ""}${lockingScript.toASM()}`;

		// MAP.app and MAP.type keys are required
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
