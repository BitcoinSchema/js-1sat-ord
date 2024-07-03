import { P2PKH, type Script } from "@bsv/sdk";
import type { MAP } from ".";
/**
 * OrdP2PKH (1Sat Ordinal + Pay To Public Key Hash) class implementing ScriptTemplate.
 *
 * This class provides methods to create an Ordinal with Pay To Public Key Hash locking and unlocking scripts,
 * including the unlocking of P2PKH UTXOs with the private key.
 */
export default class OrdP2PKH extends P2PKH {
    /**
     * Creates a 1Sat Ordinal + P2PKH locking script for a given address string
     *
     * @param {string} destinationAddress - An address representing the public key hash.
     * @param {string} [b64File] - Base64 encoded file data.
     * @param {string} [mediaType] - Media type of the file.
     * @param {MAP} [metaData] - (optional) MAP Metadata to be included in OP_RETURN.
     * @returns {LockingScript} - A P2PKH locking script.
     */
    lock(destinationAddress: string, b64File?: string | undefined, mediaType?: string | undefined, metaData?: MAP | undefined): Script;
}
