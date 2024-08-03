import { PrivateKey, Transaction } from "@bsv/sdk";
import { cancelOrdListings, cancelOrdTokenListings } from "./cancelListings";
import { type CancelOrdListingsConfig, type CancelOrdTokenListingsConfig, type Utxo, type TokenUtxo, TokenType } from "./types";

describe("cancelOrdListings", () => {
  const paymentPk = PrivateKey.fromWif("Kyc95acVeLJiDgPvPX1CLZP4hBZrT2oQFp5YG5rHtmiakWzcdLtV");
  const ordPk = PrivateKey.fromWif("L4JCYBCEnVVuiJeXSA1R3Kyy2kFSsqX5jEVWF2h7PbCk7mgRfkq8");
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

    expect(tx.outputs).toHaveLength(4); // 1 for ordinal return, 1 for additional payment, 1 for change, 1 for fee
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
  const paymentPk = PrivateKey.fromWif("KzwfqdfecMRtpg65j2BeRtixboNR37fSCDr8QbndV6ySEPT4xibW");
  const ordPk = PrivateKey.fromWif("L1Xo9Zp5Ld9JcYGvkzVgGYbKvmwXj4zYJu9hDwp1uQANQQhXCmVc");
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

    expect(tx.outputs[0].lockingScript.toString()).toContain("bsv-20");
    expect(tx.outputs[0].lockingScript.toString()).toContain("id");
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