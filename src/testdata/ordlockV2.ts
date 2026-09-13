// Shared fixtures for the OrdLock v2 tests: real keys, real scripts, and a
// script-interpreter check so a built transaction is proven to satisfy the
// listing contract rather than merely having the expected shape.
import {
	P2PKH,
	PrivateKey,
	type Script,
	Spend,
	type Transaction,
	type UnlockingScript,
} from "@bsv/sdk";
import type { Inscription, Utxo } from "../types";
import { applyInscription } from "../templates/ordP2pkh";
import { listingLockingScript } from "../createListings";

export const paymentPk = PrivateKey.fromWif(
	"KwE2RgUthyfEZbzrS3EEgSRVr1NodBc9B3vPww6oSGChDuWS6Heb",
);
export const ordPk = PrivateKey.fromWif(
	"L5mDYNS6Dqjy72LA66sJ6V7APxgKF3DHXUagKbf7q4ctv9c9Rwpb",
);
export const paymentAddress = paymentPk.toAddress().toString();
export const ordAddress = ordPk.toAddress().toString();

const b64 = (script: Script) =>
	Buffer.from(script.toBinary()).toString("base64");

let counter = 0;
const fakeTxid = () =>
	(counter++).toString(16).padStart(2, "0").repeat(32);

/** A P2PKH utxo owned by `paymentPk`. */
export const payUtxo = (satoshis: number, key = paymentPk): Utxo => ({
	satoshis,
	txid: fakeTxid(),
	vout: 0,
	script: b64(new P2PKH().lock(key.toAddress())),
});

/** A 1-sat ordinal utxo owned by `ordPk`, optionally inscribed. */
export const ordUtxo = (inscription?: Inscription, key = ordPk): Utxo => ({
	satoshis: 1,
	txid: fakeTxid(),
	vout: 0,
	script: b64(applyInscription(new P2PKH().lock(key.toAddress()), inscription)),
});

/** A 1-sat OrdLock v2 listing utxo (cancel key `ordPk`, payout to `paymentAddress`). */
export const listingUtxo = (
	price: number,
	inscription?: Inscription,
	sellerKey = ordPk,
): Utxo => ({
	satoshis: 1,
	txid: fakeTxid(),
	vout: 0,
	script: b64(
		listingLockingScript(
			sellerKey.toAddress().toString(),
			paymentAddress,
			price,
			inscription,
		),
	),
});

/**
 * Runs the script interpreter over input `i` of a signed transaction and
 * returns true when the unlocking script satisfies the source locking script.
 */
export const validateInput = (tx: Transaction, i: number): boolean => {
	const input = tx.inputs[i];
	const src = input.sourceTransaction?.outputs[input.sourceOutputIndex];
	if (!src) throw new Error(`input ${i} has no source output`);
	const spend = new Spend({
		sourceTXID: input.sourceTXID as string,
		sourceOutputIndex: input.sourceOutputIndex,
		sourceSatoshis: src.satoshis as number,
		lockingScript: src.lockingScript,
		transactionVersion: tx.version,
		otherInputs: tx.inputs.filter((_, j) => j !== i),
		outputs: tx.outputs,
		inputIndex: i,
		unlockingScript: input.unlockingScript as UnlockingScript,
		inputSequence: input.sequence as number,
		lockTime: tx.lockTime,
	});
	return spend.validate();
};

/** Every input of `tx` validates under the interpreter. */
export const validateAllInputs = (tx: Transaction): boolean =>
	tx.inputs.every((_, i) => validateInput(tx, i));
