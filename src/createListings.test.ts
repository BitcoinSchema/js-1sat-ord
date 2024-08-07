import { PrivateKey, Transaction } from "@bsv/sdk";
import { createOrdListings, createOrdTokenListings } from "./createListings";
import {
  TokenType,
  type CreateOrdListingsConfig,
  type CreateOrdTokenListingsConfig,
  type NewListing,
  type NewTokenListing,
  type TokenUtxo,
  type Utxo
} from "./types";

describe("createOrdListings", () => {
  const paymentPk = PrivateKey.fromWif("KwE2RgUthyfEZbzrS3EEgSRVr1NodBc9B3vPww6oSGChDuWS6Heb");
  const ordPk = PrivateKey.fromWif("L5mDYNS6Dqjy72LA66sJ6V7APxgKF3DHXUagKbf7q4ctv9c9Rwpb");
  const address = paymentPk.toAddress().toString();

  const utxos: Utxo[] = [{
    satoshis: 10000,
    txid: "ecb483eda58f26da1b1f8f15b782b1186abdf9c6399a1c3e63e0d429d5092a41",
    vout: 0,
    script: "base64EncodedScript",
  }];

  const listings: NewListing[] = [{
    payAddress: address,
    ordAddress: ordPk.toAddress().toString(),
    price: 5000,
    listingUtxo: {
      satoshis: 1,
      txid: "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
      vout: 0,
      script: "base64EncodedScript",
    },
  }];

  const baseConfig: CreateOrdListingsConfig = {
    utxos,
    listings,
    paymentPk,
    ordPk,
  };

  test("create ord listings with sufficient funds", async () => {
    const { tx, spentOutpoints, payChange } = await createOrdListings(baseConfig);

    expect(tx).toBeInstanceOf(Transaction);
    expect(spentOutpoints).toHaveLength(2); // 1 payment utxo + 1 listing utxo
    expect(payChange).toBeDefined();
  });

  test("create ord listings with additional payments", async () => {
    const config = {
      ...baseConfig,
      additionalPayments: [{ to: address, amount: 1000 }],
    };
    const { tx } = await createOrdListings(config);
    expect(tx.outputs).toHaveLength(3); // 1 for listing, 1 for additional payment, 1 for change
  });

  test("create ord listings with insufficient funds", async () => {
    const insufficientConfig = {
      ...baseConfig,
      utxos: [{ ...utxos[0], satoshis: 1 }],
    };
    await expect(createOrdListings(insufficientConfig)).rejects.toThrow("Not enough funds");
  });
});

describe("createOrdTokenListings", () => {
  const paymentPk = PrivateKey.fromWif("KwE2RgUthyfEZbzrS3EEgSRVr1NodBc9B3vPww6oSGChDuWS6Heb");
  const ordPk = PrivateKey.fromWif("L5mDYNS6Dqjy72LA66sJ6V7APxgKF3DHXUagKbf7q4ctv9c9Rwpb");
  const address = paymentPk.toAddress().toString();

  const utxos: Utxo[] = [{
    satoshis: 10000,
    txid: "ecb483eda58f26da1b1f8f15b782b1186abdf9c6399a1c3e63e0d429d5092a41",
    vout: 0,
    script: "base64EncodedScript",
  }];

  const inputTokens: TokenUtxo[] = [{
    satoshis: 1,
    txid: "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
    vout: 0,
    script: "base64EncodedScript",
    amt: "200000000000",
    id: "e6d40ba206340aa94ed40fe1a8adcd722c08c9438b2c1dd16b4527d561e848a2_0",
  }];

  const listings: NewTokenListing[] = [{
    payAddress: address,
    ordAddress: ordPk.toAddress().toString(),
    amt: 1000,
    price: 5000,
  }];

  const baseConfig: CreateOrdTokenListingsConfig = {
    utxos,
    listings,
    paymentPk,
    ordPk,
    protocol: TokenType.BSV20,
    tokenID: "e6d40ba206340aa94ed40fe1a8adcd722c08c9438b2c1dd16b4527d561e848a2_0",
    inputTokens,
    tokenChangeAddress: address,
    decimals: 8,
  };

  test("create ord token listings with sufficient funds", async () => {
    const { tx, spentOutpoints, payChange, tokenChange } = await createOrdTokenListings(baseConfig);

    expect(tx).toBeInstanceOf(Transaction);
    expect(spentOutpoints).toHaveLength(2); // 1 payment utxo + 1 token utxo
    expect(payChange).toBeDefined();
    expect(tokenChange).toBeDefined();
  });

  test("create ord token listings with BSV21 protocol", async () => {
    const bsv21Config = {
      ...baseConfig,
      protocol: TokenType.BSV21,
    };
    const { tx } = await createOrdTokenListings(bsv21Config);

    expect(tx.outputs[0].lockingScript.toHex()).toContain(Buffer.from("bsv-20").toString('hex'));
    expect(tx.outputs[0].lockingScript.toHex()).toContain(Buffer.from("id").toString('hex'));
  });

  test("create ord token listings with mismatched tokenID", async () => {
    const mismatchedConfig = {
      ...baseConfig,
      inputTokens: [{ ...inputTokens[0], id: "WRONGTOKEN" }],
    };
    await expect(createOrdTokenListings(mismatchedConfig)).rejects.toThrow("Input tokens do not match");
  });

  test("create ord token listings with insufficient tokens", async () => {
    const insufficientConfig = {
      ...baseConfig,
      inputTokens: [{ ...inputTokens[0], amt: "500" }],
    };
    await expect(createOrdTokenListings(insufficientConfig)).rejects.toThrow("Not enough tokens to send");
  });

  test("create ord token listings with insufficient funds", async () => {
    const insufficientConfig = {
      ...baseConfig,
      utxos: [{ ...utxos[0], satoshis: 1 }],
    };
    await expect(createOrdTokenListings(insufficientConfig)).rejects.toThrow("Not enough funds");
  });
});