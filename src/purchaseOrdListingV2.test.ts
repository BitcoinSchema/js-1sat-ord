import { describe, expect, test } from "bun:test";
import { OrdLockV2 } from "@1sat/templates";
import { OP, P2PKH, Script, Transaction } from "@bsv/sdk";
import {
	purchaseOrdListing,
	purchaseOrdTokenListing,
} from "./purchaseOrdListing";
import {
	listingUtxo,
	ordAddress,
	paymentAddress,
	paymentPk,
	payUtxo,
	validateAllInputs,
	validateInput,
} from "./testdata/ordlockV2";
import {
	type PurchaseOrdListingConfig,
	type PurchaseOrdTokenListingConfig,
	RoytaltyType,
	TokenType,
	type TokenUtxo,
} from "./types";

const buyerPk = paymentPk;
const buyerAddress = paymentAddress;
const p2pkhHex = (address: string) => new P2PKH().lock(address).toHex();
const unlockOf = (tx: Transaction, i: number) =>
	Script.fromBinary((tx.inputs[i].unlockingScript as Script).toBinary());

describe("purchaseOrdListing (OrdLock v2)", () => {
	const price = 5000;

	const baseConfig = (): PurchaseOrdListingConfig => ({
		utxos: [payUtxo(9000), payUtxo(20000)],
		paymentPk: buyerPk,
		listing: { listingUtxo: listingUtxo(price) },
		ordAddress: buyerAddress,
	});

	test("lays out front funding, cushion, payout at the listing index, receive, change", async () => {
		const { tx, spentOutpoints, payChange, cushion } =
			await purchaseOrdListing(baseConfig());

		// inputs: 0 front (20000, the largest utxo) · 1 listing · 2 fee (9000)
		expect(tx.inputs).toHaveLength(3);
		expect(spentOutpoints).toHaveLength(3);
		expect(tx.inputs[0].sourceTransaction?.outputs[0].satoshis).toBe(20000);
		expect(tx.inputs[2].sourceTransaction?.outputs[0].satoshis).toBe(9000);
		expect(OrdLockV2.isPurchase(unlockOf(tx, 1))).toBe(true);

		// outputs: 0 cushion (15000) · 1 payout (5000) · 2 receive (1) · 3 change
		expect(tx.outputs).toHaveLength(4);
		expect(tx.outputs[0].satoshis).toBe(20000 - price);
		expect(tx.outputs[0].lockingScript.toHex()).toBe(p2pkhHex(buyerAddress));
		expect(tx.outputs[1].satoshis).toBe(price);
		expect(tx.outputs[1].lockingScript.toHex()).toBe(p2pkhHex(paymentAddress));
		expect(tx.outputs[2].satoshis).toBe(1);
		expect(tx.outputs[2].lockingScript.toHex()).toBe(p2pkhHex(buyerAddress));
		expect(tx.outputs[3].change).toBe(true);
		expect(OrdLockV2.ordinalOutput(tx, 1)).toBe(2);

		expect(cushion).toEqual({
			satoshis: 15000,
			txid: tx.id("hex"),
			vout: 0,
			script: Buffer.from(tx.outputs[0].lockingScript.toBinary()).toString(
				"base64",
			),
		});
		expect(payChange?.vout).toBe(3);
		expect(payChange?.txid).toBe(tx.id("hex"));

		// the built transaction satisfies the contract and every P2PKH input
		expect(validateInput(tx, 1)).toBe(true);
		expect(validateAllInputs(tx)).toBe(true);
	});

	test("uses several front funding inputs with fillers when no single utxo covers the price", async () => {
		const { tx, cushion } = await purchaseOrdListing({
			...baseConfig(),
			utxos: [payUtxo(400), payUtxo(2000), payUtxo(2500), payUtxo(1500)],
		});

		// inputs: 0-2 front (2500 + 2000 + 1500) · 3 listing · 4 fee (400)
		expect(tx.inputs).toHaveLength(5);
		expect(OrdLockV2.isPurchase(unlockOf(tx, 3))).toBe(true);
		// outputs: 0 cushion (1000) · 1,2 fillers · 3 payout · 4 receive · 5 change
		expect(tx.outputs[0].satoshis).toBe(6000 - price);
		for (const vout of [1, 2]) {
			expect(tx.outputs[vout].satoshis).toBe(0);
			expect(tx.outputs[vout].lockingScript.toHex()).toBe(
				new Script().writeOpCode(OP.OP_FALSE).writeOpCode(OP.OP_RETURN).toHex(),
			);
		}
		expect(tx.outputs[3].satoshis).toBe(price);
		expect(tx.outputs[4].satoshis).toBe(1);
		expect(OrdLockV2.ordinalOutput(tx, 3)).toBe(4);
		expect(cushion?.vout).toBe(0);
		expect(validateAllInputs(tx)).toBe(true);
	});

	test("omits the cushion when front funding equals the price", async () => {
		const { tx, cushion } = await purchaseOrdListing({
			...baseConfig(),
			utxos: [payUtxo(price), payUtxo(300)],
		});
		// outputs: 0 filler · 1 payout · 2 receive · 3 change
		expect(tx.outputs[0].satoshis).toBe(0);
		expect(tx.outputs[1].satoshis).toBe(price);
		expect(cushion).toBeUndefined();
		expect(OrdLockV2.ordinalOutput(tx, 1)).toBe(2);
		expect(validateAllInputs(tx)).toBe(true);
	});

	test("requires a fee utxo beyond the front funding", async () => {
		// the cushion must return the remainder exactly, so one big utxo cannot also pay the fee
		await expect(
			purchaseOrdListing({ ...baseConfig(), utxos: [payUtxo(50000)] }),
		).rejects.toThrow("the fee needs its own utxo");
	});

	test("additional payments and royalties follow the receive output", async () => {
		const { tx } = await purchaseOrdListing({
			...baseConfig(),
			additionalPayments: [{ to: paymentAddress, amount: 1000 }],
			royalties: [
				{
					type: RoytaltyType.Address,
					destination: paymentAddress,
					percentage: "0.1",
				},
			],
		});
		// outputs: 0 cushion · 1 payout · 2 receive · 3 additional · 4 royalty · 5 change
		expect(tx.outputs).toHaveLength(6);
		expect(tx.outputs[3].satoshis).toBe(1000);
		expect(tx.outputs[4].satoshis).toBe(500);
		expect(OrdLockV2.ordinalOutput(tx, 1)).toBe(2);
		expect(validateAllInputs(tx)).toBe(true);
	});

	test("applies MAP metadata to the receive output", async () => {
		const { tx } = await purchaseOrdListing({
			...baseConfig(),
			metaData: { app: "js-1sat-ord-test", type: "test" },
		});
		expect(tx.outputs[2].lockingScript.toHex()).toContain(
			Buffer.from("js-1sat-ord-test").toString("hex"),
		);
		expect(validateAllInputs(tx)).toBe(true);
	});

	test("purchases a listing that carries trailing data after the contract", async () => {
		const bare = listingUtxo(price);
		const withMap = {
			...bare,
			script: Buffer.from([
				...Buffer.from(bare.script, "base64"),
				...new Script()
					.writeOpCode(OP.OP_RETURN)
					.writeBin([...Buffer.from("trailing")])
					.toBinary(),
			]).toString("base64"),
		};
		const { tx } = await purchaseOrdListing({
			...baseConfig(),
			listing: { listingUtxo: withMap },
		});
		expect(validateAllInputs(tx)).toBe(true);
	});

	test("rejects when the price cannot be covered", async () => {
		await expect(
			purchaseOrdListing({ ...baseConfig(), utxos: [payUtxo(4000)] }),
		).rejects.toThrow("Not enough funds");
	});

	test("rejects when the fee cannot be covered", async () => {
		await expect(
			purchaseOrdListing({ ...baseConfig(), utxos: [payUtxo(price)] }),
		).rejects.toThrow("Not enough funds");
	});
});

describe("purchaseOrdTokenListing (OrdLock v2)", () => {
	const tokenID =
		"e6d40ba206340aa94ed40fe1a8adcd722c08c9438b2c1dd16b4527d561e848a2_0";
	const price = 3800;
	const inscription = {
		dataB64: Buffer.from(
			JSON.stringify({ p: "bsv-20", op: "transfer", id: tokenID, amt: "1000" }),
		).toString("base64"),
		contentType: "application/bsv-20",
	};

	const baseConfig = (): PurchaseOrdTokenListingConfig => ({
		protocol: TokenType.BSV21,
		tokenID,
		utxos: [payUtxo(9000), payUtxo(20000)],
		paymentPk: buyerPk,
		listingUtxo: {
			...listingUtxo(price, inscription),
			amt: "1000",
			id: tokenID,
			price,
			isListing: true,
		} as TokenUtxo,
		ordAddress,
	});

	test("delivers a transfer inscription and pays the seller at the listing index", async () => {
		const { tx, cushion } = await purchaseOrdTokenListing(baseConfig());

		// inputs: 0 front · 1 listing (inscription-prefixed) · 2 fee
		// outputs: 0 cushion · 1 payout · 2 transfer receive · 3 change
		expect(tx.outputs[1].satoshis).toBe(price);
		expect(tx.outputs[1].lockingScript.toHex()).toBe(p2pkhHex(paymentAddress));
		expect(tx.outputs[2].satoshis).toBe(1);
		const receiveHex = tx.outputs[2].lockingScript.toHex();
		expect(receiveHex).toContain(Buffer.from("bsv-20").toString("hex"));
		expect(receiveHex).toContain(Buffer.from('"amt":"1000"').toString("hex"));
		expect(receiveHex.endsWith(p2pkhHex(ordAddress))).toBe(true);
		expect(cushion?.satoshis).toBe(20000 - price);
		expect(OrdLockV2.ordinalOutput(tx, 1)).toBe(2);
		expect(validateInput(tx, 1)).toBe(true);
		expect(validateAllInputs(tx)).toBe(true);
	});

	test("does not need the indexer payout field", async () => {
		const config = baseConfig();
		config.listingUtxo.payout = undefined;
		const { tx } = await purchaseOrdTokenListing(config);
		expect(validateAllInputs(tx)).toBe(true);
	});

	test("additional payments follow the receive output", async () => {
		const { tx } = await purchaseOrdTokenListing({
			...baseConfig(),
			additionalPayments: [{ to: paymentAddress, amount: 1000 }],
		});
		expect(tx.outputs).toHaveLength(5); // cushion, payout, receive, additional, change
		expect(tx.outputs[3].satoshis).toBe(1000);
		expect(validateAllInputs(tx)).toBe(true);
	});

	test("rejects when the price cannot be covered", async () => {
		await expect(
			purchaseOrdTokenListing({ ...baseConfig(), utxos: [payUtxo(1)] }),
		).rejects.toThrow("Not enough funds");
	});
});
