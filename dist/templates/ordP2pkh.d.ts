import { P2PKH, type Script } from "@bsv/sdk";
import type { Inscription, MAP } from "../types";
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
    lock(address: string, inscription?: Inscription, metaData?: MAP | undefined): Script;
}
