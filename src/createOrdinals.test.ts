import { describe, expect, test } from "bun:test";
import { PrivateKey, Script, Transaction, Utils } from "@bsv/sdk";
import { createOrdinals } from "./createOrdinals";
import type { CreateOrdinalsConfig, Utxo, Destination, Inscription, PreMAP } from "./types";

describe("createOrdinals", () => {
  const paymentPk = PrivateKey.fromWif("KwE2RgUthyfEZbzrS3EEgSRVr1NodBc9B3vPww6oSGChDuWS6Heb");
  const address = paymentPk.toAddress().toString();

  const utxos: Utxo[] = [{
    satoshis: 10000,
    txid: "ecb483eda58f26da1b1f8f15b782b1186abdf9c6399a1c3e63e0d429d5092a41",
    vout: 0,
    script: "base64EncodedScript",
  }];

  const inscription: Inscription = {
    dataB64: Buffer.from("Test Inscription").toString("base64"),
    contentType: "text/plain",
  };

  const destinations: Destination[] = [{
    address,
    inscription,
  }];

  const baseConfig: CreateOrdinalsConfig = {
    utxos,
    destinations,
    paymentPk,
  };

  test("create ordinals with sufficient funds", async () => {
    const { tx, spentOutpoints, payChange } = await createOrdinals(baseConfig);

    expect(tx).toBeInstanceOf(Transaction);
    expect(spentOutpoints).toHaveLength(1);
    expect(payChange).toBeDefined();
  });

  test("create ordinals with additional payments", async () => {
    const config = {
      ...baseConfig,
      additionalPayments: [{ to: address, amount: 1000 }],
    };
    const { tx } = await createOrdinals(config);

    expect(tx.outputs).toHaveLength(3); // 1 for inscription, 1 for additional payment, 1 for change
  });

  test("create ordinals with metadata", async () => {
    const metaData: PreMAP = {
      name: "Test Ordinal",
      description: "This is a test ordinal",
      app: "js-1sat-ord-test",
      type: "ord"
    };
    const config: CreateOrdinalsConfig = {
      ...baseConfig,
      metaData,
    };
    const { tx } = await createOrdinals(config);

    // Check if metadata is included in the output script
    expect(tx.outputs[0].lockingScript.toHex()).toContain(Buffer.from("Test Ordinal").toString("hex"));
  });

  test("create ordinals with insufficient funds", async () => {
    const insufficientConfig = {
      ...baseConfig,
      utxos: [{ ...utxos[0], satoshis: 1 }],
    };
    await expect(createOrdinals(insufficientConfig)).rejects.toThrow();
  });

  test("create multiple ordinals", async () => {
    const multipleDestinations = [
      ...destinations,
      { address, inscription: { ...inscription, dataB64: Buffer.from("Second Inscription").toString("base64") } },
    ];
    const config = {
      ...baseConfig,
      destinations: multipleDestinations,
    };
    const { tx } = await createOrdinals(config);

    expect(tx.outputs).toHaveLength(3); // 2 for inscriptions, 1 for change
  });

  test("create ordinals with custom change address", async () => {
    const customChangeAddress = "1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2";
    const config = {
      ...baseConfig,
      changeAddress: customChangeAddress,
    };
    const { tx, payChange } = await createOrdinals(config);
    expect(payChange).toBeDefined();
    const changeScript = Script.fromBinary(Utils.toArray(payChange?.script, 'base64'))
    expect(Utils.toBase58Check(changeScript.chunks[2].data as number[])).toEqual(customChangeAddress);
  });

  // test("create ordinals with signer", async () => {
  //   const mockSigner = {
  //     sign: jest.fn().mockResolvedValue("mockedSignature"),
  //   };
  //   const config: CreateOrdinalsConfig = {
  //     ...baseConfig,
  //     signer: mockSigner,
  //   };
  //   await createOrdinals(config);

  //   expect(mockSigner.sign).toHaveBeenCalled();
  // });
});