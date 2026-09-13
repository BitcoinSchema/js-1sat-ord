import { describe, expect, test } from "bun:test";
import { OrdLockV2 } from "@1sat/templates";
import { P2PKH, PrivateKey, Script, Transaction } from "@bsv/sdk";
import { cancelOrdListings, cancelOrdTokenListings } from "./cancelListings";
import {
	listingUtxo,
	ordAddress,
	ordPk,
	paymentAddress,
	paymentPk,
	payUtxo,
	validateAllInputs,
	validateInput,
} from "./testdata/ordlockV2";
import {
	type CancelOrdListingsConfig,
	type CancelOrdTokenListingsConfig,
	TokenType,
	type TokenUtxo,
} from "./types";

const p2pkhHex = (address: string) => new P2PKH().lock(address).toHex();
const unlockOf = (tx: Transaction, i: number) =>
	Script.fromBinary((tx.inputs[i].unlockingScript as Script).toBinary());

describe("cancelOrdListings (OrdLock v2)", () => {
	const baseConfig = (): CancelOrdListingsConfig => ({
		utxos: [payUtxo(10000)],
		paymentPk,
		ordPk,
		listingUtxos: [listingUtxo(5000)],
		additionalPayments: [],
	});

	test("returns the ordinal to the seller with the v2 cancel branch", async () => {
		const { tx, spentOutpoints, payChange } = await cancelOrdListings(
			baseConfig(),
		);

		expect(spentOutpoints).toHaveLength(2); // listing + payment utxo
		expect(payChange).toBeDefined();
		expect(OrdLockV2.isCancel(unlockOf(tx, 0))).toBe(true);
		expect(tx.outputs[0].satoshis).toBe(1);
		expect(tx.outputs[0].lockingScript.toHex()).toBe(p2pkhHex(ordAddress));
		expect(validateInput(tx, 0)).toBe(true);
		expect(validateAllInputs(tx)).toBe(true);
	});

	test("cancels several listings in one transaction, one return per index", async () => {
		const { tx } = await cancelOrdListings({
			...baseConfig(),
			listingUtxos: [listingUtxo(5000), listingUtxo(7000), listingUtxo(9000)],
			additionalPayments: [{ to: paymentAddress, amount: 500 }],
		});
		expect(tx.outputs).toHaveLength(5); // 3 returns, 1 additional, 1 change
		for (const i of [0, 1, 2]) {
			expect(OrdLockV2.isCancel(unlockOf(tx, i))).toBe(true);
			expect(tx.outputs[i].satoshis).toBe(1);
			expect(OrdLockV2.ordinalOutput(tx, i)).toBe(i);
		}
		expect(validateAllInputs(tx)).toBe(true);
	});

	test("mixes v2 and legacy listings in one cancel", async () => {
		const legacy = {
			...listingUtxo(5000),
			// a script the v2 recognizer does not match falls back to the v1 cancel unlock
			script: Buffer.from(new P2PKH().lock(ordAddress).toBinary()).toString(
				"base64",
			),
		};
		const { tx } = await cancelOrdListings({
			...baseConfig(),
			listingUtxos: [listingUtxo(5000), legacy],
		});
		expect(OrdLockV2.isCancel(unlockOf(tx, 0))).toBe(true);
		expect(OrdLockV2.isCancel(unlockOf(tx, 1))).toBe(false);
		expect(unlockOf(tx, 1).chunks).toHaveLength(3); // <sig> <pubkey> OP_1 (legacy shape)
		expect(validateInput(tx, 0)).toBe(true);
	});

	test("refuses to cancel with a key that is not the listing's seller", async () => {
		await expect(
			cancelOrdListings({
				...baseConfig(),
				ordPk: PrivateKey.fromRandom(),
			}),
		).rejects.toThrow("can only be cancelled by");
	});

	test("cancel ord listings with insufficient funds", async () => {
		await expect(
			cancelOrdListings({ ...baseConfig(), utxos: [payUtxo(1)] }),
		).rejects.toThrow("Not enough funds");
	});
});

describe("cancelOrdTokenListings (OrdLock v2)", () => {
	const tokenID =
		"e6d40ba206340aa94ed40fe1a8adcd722c08c9438b2c1dd16b4527d561e848a2_0";
	const inscription = (amt: string) => ({
		dataB64: Buffer.from(
			JSON.stringify({ p: "bsv-20", op: "transfer", id: tokenID, amt }),
		).toString("base64"),
		contentType: "application/bsv-20",
	});

	const baseConfig = (): CancelOrdTokenListingsConfig => ({
		utxos: [payUtxo(10000)],
		paymentPk,
		ordPk,
		listingUtxos: [
			{ ...listingUtxo(3800, inscription("1000")), amt: "1000", id: tokenID },
			{ ...listingUtxo(9000, inscription("250")), amt: "250", id: tokenID },
		] as TokenUtxo[],
		additionalPayments: [],
		protocol: TokenType.BSV21,
		tokenID,
	});

	test("consolidates the cancelled amount into one transfer inscription", async () => {
		const { tx, tokenChange } = await cancelOrdTokenListings(baseConfig());

		const hex = tx.outputs[0].lockingScript.toHex();
		expect(hex).toContain(Buffer.from('"amt":"1250"').toString("hex"));
		expect(hex.endsWith(p2pkhHex(ordAddress))).toBe(true);
		expect(tokenChange?.[0].amt).toBe("1250");
		expect(tokenChange?.[0].txid).toBe(tx.id("hex"));
		expect(OrdLockV2.isCancel(unlockOf(tx, 0))).toBe(true);
		expect(OrdLockV2.isCancel(unlockOf(tx, 1))).toBe(true);
		expect(validateAllInputs(tx)).toBe(true);
	});

	test("cancel ord token listings with mismatched tokenID", async () => {
		const config = baseConfig();
		config.listingUtxos[0].id = "WRONGTOKEN";
		await expect(cancelOrdTokenListings(config)).rejects.toThrow(
			"Input tokens do not match",
		);
	});
});
