import { describe, expect, test } from "bun:test";
import { OrdLock as OrdLockV1, OrdLockV2 } from "@1sat/templates";
import { Script, Transaction } from "@bsv/sdk";
import { createOrdListings, createOrdTokenListings } from "./createListings";
import OrdLock, { ORDLOCK_CREATE_DISABLED } from "./templates/ordLock";
import {
	ordAddress,
	ordPk,
	ordUtxo,
	paymentAddress,
	paymentPk,
	payUtxo,
	validateAllInputs,
} from "./testdata/ordlockV2";
import {
	type CreateOrdListingsConfig,
	type CreateOrdTokenListingsConfig,
	type NewListing,
	type NewTokenListing,
	TokenType,
	type TokenUtxo,
	type Utxo,
} from "./types";

const scriptOf = (tx: Transaction, vout: number) =>
	Script.fromBinary(tx.outputs[vout].lockingScript.toBinary());

describe("createOrdListings", () => {
	const utxos: Utxo[] = [payUtxo(10000)];

	const listings: NewListing[] = [
		{
			payAddress: paymentAddress,
			ordAddress,
			price: 5000,
			listingUtxo: ordUtxo({ dataB64: "aGVsbG8=", contentType: "text/plain" }),
		},
	];

	const baseConfig: CreateOrdListingsConfig = {
		utxos,
		listings,
		paymentPk,
		ordPk,
	};

	test("create ord listings with sufficient funds", async () => {
		const { tx, spentOutpoints, payChange } =
			await createOrdListings(baseConfig);

		expect(tx).toBeInstanceOf(Transaction);
		expect(spentOutpoints).toHaveLength(2); // 1 payment utxo + 1 listing utxo
		expect(payChange).toBeDefined();
		expect(validateAllInputs(tx)).toBe(true);
	});

	test("listing output is an OrdLock v2 contract", async () => {
		const { tx } = await createOrdListings(baseConfig);
		const decoded = OrdLockV2.decode(scriptOf(tx, 0));
		expect(decoded).not.toBeNull();
		expect(decoded?.seller).toBe(ordAddress);
		expect(decoded?.price).toBe(5000n);
		expect(decoded?.offset).toBe(0);
		expect(tx.outputs[0].satoshis).toBe(1);
		// v1 recognizer must not match a v2 listing
		expect(OrdLockV1.decode(scriptOf(tx, 0))).toBeNull();
	});

	test("create ord listings with additional payments", async () => {
		const config = {
			...baseConfig,
			additionalPayments: [{ to: paymentAddress, amount: 1000 }],
		};
		const { tx } = await createOrdListings(config);
		expect(tx.outputs).toHaveLength(3); // 1 for listing, 1 for additional payment, 1 for change
	});

	test("create ord listings with insufficient funds", async () => {
		const insufficientConfig = {
			...baseConfig,
			utxos: [{ ...utxos[0], satoshis: 1 }],
		};
		await expect(createOrdListings(insufficientConfig)).rejects.toThrow(
			"Not enough funds",
		);
	});

	test("legacy OrdLock.lock stays disabled", () => {
		expect(() =>
			new OrdLock().lock(ordAddress, paymentAddress, 5000),
		).toThrow(ORDLOCK_CREATE_DISABLED);
	});
});

describe("createOrdTokenListings", () => {
	const tokenID =
		"e6d40ba206340aa94ed40fe1a8adcd722c08c9438b2c1dd16b4527d561e848a2_0";
	const utxos: Utxo[] = [payUtxo(10000)];

	const inputTokens: TokenUtxo[] = [
		{
			...ordUtxo({
				dataB64: Buffer.from(
					JSON.stringify({
						p: "bsv-20",
						op: "transfer",
						id: tokenID,
						amt: "200000000000",
					}),
				).toString("base64"),
				contentType: "application/bsv-20",
			}),
			amt: "200000000000",
			id: tokenID,
		},
	];

	const listings: NewTokenListing[] = [
		{
			payAddress: paymentAddress,
			ordAddress,
			tokens: 1000,
			price: 5000,
		},
	];

	const baseConfig: CreateOrdTokenListingsConfig = {
		utxos,
		listings,
		paymentPk,
		ordPk,
		protocol: TokenType.BSV20,
		tokenID,
		inputTokens,
		tokenChangeAddress: paymentAddress,
		decimals: 8,
	};

	test("create ord token listings with sufficient funds", async () => {
		const { tx, spentOutpoints, payChange, tokenChange } =
			await createOrdTokenListings(baseConfig);

		expect(tx).toBeInstanceOf(Transaction);
		expect(spentOutpoints).toHaveLength(2); // 1 payment utxo + 1 token utxo
		expect(payChange).toBeDefined();
		expect(tokenChange).toBeDefined();
		if (tokenChange) {
			expect(tokenChange[0].amt).toBe("100000000000");
			expect(tokenChange[0].txid).toBe(tx.id("hex"));
		}
		expect(validateAllInputs(tx)).toBe(true);
	});

	test("token listing carries the transfer inscription ahead of the v2 contract", async () => {
		const { tx } = await createOrdTokenListings(baseConfig);
		const script = scriptOf(tx, 0);
		const hex = script.toHex();
		expect(hex.startsWith("0063036f7264")).toBe(true); // OP_0 OP_IF "ord"
		expect(hex).toContain(Buffer.from('"amt":"100000000000"').toString("hex"));
		const decoded = OrdLockV2.decode(script);
		expect(decoded).not.toBeNull();
		expect(decoded?.price).toBe(5000n);
		expect(decoded?.seller).toBe(ordAddress);
		expect(decoded?.offset).toBeGreaterThan(0);
		// exactly envelope || contract: nothing stray between OP_ENDIF and the contract
		const bare = OrdLockV2.lock(ordAddress, paymentAddress, 5000).toHex();
		const envelope = hex.slice(0, hex.length - bare.length);
		expect(envelope.endsWith("68")).toBe(true); // OP_ENDIF
		expect(hex).toBe(envelope + bare);
		expect(hex.endsWith(bare)).toBe(true);
	});

	test("create ord token listings with BSV21 protocol", async () => {
		const bsv21Config = {
			...baseConfig,
			protocol: TokenType.BSV21,
		};
		const { tx } = await createOrdTokenListings(bsv21Config);

		expect(tx.outputs[0].lockingScript.toHex()).toContain(
			Buffer.from("bsv-20").toString("hex"),
		);
		expect(tx.outputs[0].lockingScript.toHex()).toContain(
			Buffer.from('"id"').toString("hex"),
		);
	});

	test("create ord token listings with mismatched tokenID", async () => {
		const mismatchedConfig = {
			...baseConfig,
			inputTokens: [{ ...inputTokens[0], id: "WRONGTOKEN" }],
		};
		await expect(createOrdTokenListings(mismatchedConfig)).rejects.toThrow(
			"Input tokens do not match",
		);
	});

	test("create ord token listings with insufficient funds", async () => {
		const insufficientConfig = {
			...baseConfig,
			utxos: [{ ...utxos[0], satoshis: 1 }],
		};
		await expect(createOrdTokenListings(insufficientConfig)).rejects.toThrow(
			"Not enough funds",
		);
	});
});
