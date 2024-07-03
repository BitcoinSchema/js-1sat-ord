import { type Transaction, type UnlockingScript, fromUtxo } from "@bsv/sdk";
import type { Utxo } from "../types";

export const fromB64Utxo = (
	utxo: Utxo,
	unlockScriptTemplate: {
		sign: (tx: Transaction, inputIndex: number) => Promise<UnlockingScript>;
		estimateLength: (tx: Transaction, inputIndex: number) => Promise<number>;
	},
) => {
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
