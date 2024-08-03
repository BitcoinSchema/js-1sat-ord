import { PrivateKey, Transaction } from "@bsv/sdk";
import { cancelOrdListings, cancelOrdTokenListings } from "./cancelListings";
import { type CancelOrdListingsConfig, type CancelOrdTokenListingsConfig, type Utxo, type TokenUtxo, TokenType } from "./types";

describe("cancelOrdListings", () => {
  const paymentPk = PrivateKey.fromWif("KwE2RgUthyfEZbzrS3EEgSRVr1NodBc9B3vPww6oSGChDuWS6Heb");
  const ordPk = PrivateKey.fromWif("L5mDYNS6Dqjy72LA66sJ6V7APxgKF3DHXUagKbf7q4ctv9c9Rwpb");
  const address = paymentPk.toAddress().toString();

  const utxos: Utxo[] = [{
    satoshis: 10000,
    txid: "ecb483eda58f26da1b1f8f15b782b1186abdf9c6399a1c3e63e0d429d5092a41",
    vout: 0,
    script: "base64EncodedScript",
  }];

  const listingUtxos: Utxo[] = [{
    satoshis: 1,
    txid: "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
    vout: 0,
    script: "base64EncodedScript",
  }];

  const baseConfig: CancelOrdListingsConfig = {
    utxos,
    paymentPk,
    ordPk,
    listingUtxos,
    additionalPayments: [],
  };

  test("cancel ord listings with sufficient funds", async () => {
    const { tx, spentOutpoints, payChange } = await cancelOrdListings(baseConfig);

    expect(tx).toBeInstanceOf(Transaction);
    expect(spentOutpoints).toHaveLength(2); // 1 payment utxo + 1 listing utxo
    expect(payChange).toBeDefined();
  });

  test("cancel ord listings with additional payments", async () => {
    const config = {
      ...baseConfig,
      additionalPayments: [{ to: address, amount: 1000 }],
    };
    const { tx } = await cancelOrdListings(config);
    console.log("cancel rawtx", tx.toHex())
    expect(tx.outputs).toHaveLength(3); // 1 for ordinal return, 1 for additional payment, 1 for change
  });

  test("cancel ord listings with insufficient funds", async () => {
    const insufficientConfig = {
      ...baseConfig,
      utxos: [{ ...utxos[0], satoshis: 1 }],
    };
    await expect(cancelOrdListings(insufficientConfig)).rejects.toThrow("Not enough funds");
  });
});

describe("cancelOrdTokenListings", () => {
  const paymentPk = PrivateKey.fromWif("KwE2RgUthyfEZbzrS3EEgSRVr1NodBc9B3vPww6oSGChDuWS6Heb");
  const ordPk = PrivateKey.fromWif("L5mDYNS6Dqjy72LA66sJ6V7APxgKF3DHXUagKbf7q4ctv9c9Rwpb");
  const address = paymentPk.toAddress().toString();

  const utxos: Utxo[] = [{
    satoshis: 10000,
    txid: "ecb483eda58f26da1b1f8f15b782b1186abdf9c6399a1c3e63e0d429d5092a41",
    vout: 0,
    script: "base64EncodedScript",
  }];

  const listingUtxos: TokenUtxo[] = [{
    satoshis: 1,
    txid: "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
    vout: 0,
    script: "base64EncodedScript",
    amt: "1000",
    id: "TOKEN123",
  }];

  const baseConfig: CancelOrdTokenListingsConfig = {
    utxos,
    paymentPk,
    ordPk,
    listingUtxos,
    additionalPayments: [],
    protocol: TokenType.BSV20,
    tokenID: "TOKEN123",
  };

  test("cancel ord token listings with sufficient funds", async () => {
    const { tx, spentOutpoints, payChange } = await cancelOrdTokenListings(baseConfig);

    expect(tx).toBeInstanceOf(Transaction);
    expect(spentOutpoints).toHaveLength(2); // 1 payment utxo + 1 listing utxo
    expect(payChange).toBeDefined();
  });

  test("cancel ord token listings with BSV21 protocol", async () => {
    const bsv21Config = {
      ...baseConfig,
      protocol: TokenType.BSV21,
    };
    const { tx } = await cancelOrdTokenListings(bsv21Config);

    expect(tx.outputs[0].lockingScript.toHex()).toContain(Buffer.from("bsv-20").toString('hex'));
    expect(tx.outputs[0].lockingScript.toHex()).toContain(Buffer.from("id").toString('hex'));
  });

  test("cancel ord token listings with mismatched tokenID", async () => {
    const mismatchedConfig = {
      ...baseConfig,
      listingUtxos: [{ ...listingUtxos[0], id: "WRONGTOKEN" }],
    };
    await expect(cancelOrdTokenListings(mismatchedConfig)).rejects.toThrow("Input tokens do not match");
  });

  test("cancel ord token listings with insufficient funds", async () => {
    const insufficientConfig = {
      ...baseConfig,
      utxos: [{ ...utxos[0], satoshis: 1 }],
    };
    await expect(cancelOrdTokenListings(insufficientConfig)).rejects.toThrow("Not enough funds");
  });
});