import { PrivateKey, Utils } from "@bsv/sdk";
import { createOrdinals, sendOrdinals } from ".";
import OrdP2PKH from "./templates/ordP2pkh";
import type { Destination } from "./types";
import type { SendOrdinalsConfig } from "./sendOrdinals";
import type { CreateOrdinalsConfig } from "./createOrdinals";
import { P2PKH } from "@bsv/sdk";

test("test build inscription", () => {
	const b64Data = "# Hello World!";
	const insc = new OrdP2PKH().lock(
		"18qHtzaMU5PxJ2Yfuw8yJvDCbULrv1Xsdx",
		b64Data,
		"text/markdown",
	);
	expect(insc.toASM()).toBe(
		"OP_0 OP_IF 6f7264 OP_1 746578742f6d61726b646f776e OP_0 1de965a16a2b95 OP_ENDIF OP_DUP OP_HASH160 55eaf379d85b0ab99cf5bbfc38a583eafee11683 OP_EQUALVERIFY OP_CHECKSIG",
	);
});

test("test build inscription w metadata", () => {
	const b64Data = "# Hello world!";
	const insc = new OrdP2PKH().lock(
		"18qHtzaMU5PxJ2Yfuw8yJvDCbULrv1Xsdx",
		b64Data,
		"text/markdown",
		{
			app: "js-1sat-ord-test",
			type: "test",
		},
	);
	expect(insc.toASM()).toBe(
		"OP_0 OP_IF 6f7264 OP_1 746578742f6d61726b646f776e OP_0 1de965a30a2b95 OP_ENDIF OP_DUP OP_HASH160 55eaf379d85b0ab99cf5bbfc38a583eafee11683 OP_EQUALVERIFY OP_CHECKSIG OP_RETURN 3150755161374b36324d694b43747373534c4b79316b683536575755374d74555235 534554 617070 6a732d317361742d6f72642d74657374 74797065 74657374",
	);
});

test("create and send ordinal inscription", async () => {
	const paymentPk = PrivateKey.fromWif(
		"KzwfqdfecMRtpg65j2BeRtixboNR37fSCDr8QbndV6ySEPT4xibW",
	);
	const changeAddress = paymentPk.toAddress();
	let utxos = [
		{
			satoshis: 100000,
			txid: "ecb483eda58f26da1b1f8f15b782b1186abdf9c6399a1c3e63e0d429d5092a41",
			vout: 0,
      script: Buffer.from(new P2PKH().lock(changeAddress).toHex(), 'hex').toString('base64'),
		},
	];

	let destinations: Destination[] = [
		{
			address: changeAddress,
			inscription: {
				dataB64: Buffer.from("hello world").toString("base64"),
				contentType: "text/plain",
			},
		},
	];

  const createOrdinalsConfig: CreateOrdinalsConfig = {
    utxos,
    destinations,
    paymentPk,
  }
	const { tx } = await createOrdinals(createOrdinalsConfig);
	console.log({ createOrdinal: tx.toHex() });

	utxos = [
		{
			satoshis: tx.outputs[1].satoshis || 1,
			txid: tx.id("hex"),
			vout: 1,
			script: Buffer.from(tx.outputs[1].lockingScript.toHex(), "hex").toString(
				"base64",
			),
		},
	];

	let ordinals = [
		{
			satoshis: tx.outputs[0].satoshis || 1,
			txid: tx.id("hex"),
			vout: 0,
			script: Buffer.from(tx.outputs[0].lockingScript.toHex(), "hex").toString(
				"base64",
			),
		},
	];

	destinations = [
		{
			address: changeAddress,
			inscription: {
				dataB64: Buffer.from("reinscription!").toString("base64"),
				contentType: "text/plain",
			},
		},
	];

	const { tx: tx2 } = await sendOrdinals({
		paymentUtxos: utxos,
		ordinals,
		paymentPk,
		destinations,
		ordPk: paymentPk,
	});
	console.log({ sendCreatedOrdinal: tx2.toHex() });

	utxos = [
		{
			satoshis: tx2.outputs[1].satoshis || 1,
			txid: tx2.id("hex"),
			vout: 1,
			script: Buffer.from(tx.outputs[1].lockingScript.toHex(), "hex").toString(
				"base64",
			),
		},
	];

	ordinals = [
		{
			satoshis: tx2.outputs[0].satoshis || 1,
			txid: tx2.id("hex"),
			vout: 0,
			script: Buffer.from(tx2.outputs[0].lockingScript.toHex(), "hex").toString(
				"base64",
			),
		},
	];

	destinations = [
		{
			address: changeAddress,
		},
	];

  const sendConfig: SendOrdinalsConfig = {
    paymentUtxos: utxos,
    ordinals,
    paymentPk,
    ordPk: paymentPk,
    destinations,
  }
	const { tx: tx3 } = await sendOrdinals(sendConfig);
	console.log({ sendSentOrdinal: tx3.toHex() });
});
