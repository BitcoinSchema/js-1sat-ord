import { type Transaction, type UnlockingScript, fromUtxo, type TransactionInput, Utils, P2PKH } from "@bsv/sdk";
import type { Utxo } from "../types";
import { API_HOST } from "../constants";

const { fromBase58Check } = Utils;

/**
 * Converts a Utxo object with a base64 encoded script to a Utxo object with a hex encoded script
 * @param {Utxo} utxo - Utxo object with base64 encoded script
 * @param {Object} unlockScriptTemplate - Object with sign and estimateLength functions
 * @returns {TransactionInput} Utxo object with hex encoded script
 */
export const inputFromB64Utxo = (
	utxo: Utxo,
	unlockScriptTemplate: {
		sign: (tx: Transaction, inputIndex: number) => Promise<UnlockingScript>;
		estimateLength: (tx: Transaction, inputIndex: number) => Promise<number>;
	},
): TransactionInput => {
	const input = fromUtxo(
		{
			...utxo,
			script: Buffer.from(utxo.script, "base64").toString("hex"),
		},
		unlockScriptTemplate,
	);
	input.sourceTXID = utxo.txid;
	return input;
};

export const fetchPayUtxos = async (address: string) => {
  const payUrl = `${API_HOST}/txos/address/${address}/unspent?bsv20=false`;
  console.log({ payUrl });
  const payRes = await fetch(payUrl);
  if (!payRes.ok) {
    console.error("Error fetching pay utxos:", payRes.statusText);
    return;
  }
  let payUtxos = await payRes.json();
  // exclude all 1 satoshi utxos
  payUtxos = payUtxos.filter((u: { satoshis: number }) => u.satoshis !== 1)

  // Get pubkey hash from address
  const pubKeyHash = fromBase58Check(address)
  const p2pkhScript = new P2PKH().lock(pubKeyHash.data)
  payUtxos = payUtxos.map((utxo: {
		txid: string;
		vout: number;
		satoshis: number;
	}) => ({
      txid: utxo.txid,
      vout: utxo.vout,
      satoshis: utxo.satoshis,
      script: Buffer.from(p2pkhScript.toBinary()).toString("base64"),
  }))
  return payUtxos
}