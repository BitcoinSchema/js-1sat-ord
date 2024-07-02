import { P2PKH, type Script } from "@bsv/sdk";
import type { MAP } from ".";
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
    lock(destinationAddress: string, b64File?: string | undefined, mediaType?: string | undefined, metaData?: MAP | undefined): Script;
}
