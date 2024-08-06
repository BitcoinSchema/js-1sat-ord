import { PrivateKey, Transaction } from "@bsv/sdk";
import { purchaseOrdTokenListing } from "./purchaseOrdListing";
import { TokenType, type PurchaseOrdTokenListingConfig, type TokenUtxo, type Utxo } from "./types";

describe("purchaseOrdListings", () => {
  const paymentPk = PrivateKey.fromWif("KwE2RgUthyfEZbzrS3EEgSRVr1NodBc9B3vPww6oSGChDuWS6Heb");
  const address = paymentPk.toAddress().toString();

  const utxos: Utxo[] = [{
    satoshis: 9910000,
    txid: "ecb483eda58f26da1b1f8f15b782b1186abdf9c6399a1c3e63e0d429d5092a41",
    vout: 0,
    script: "base64EncodedScript",
  }];

  const listingUtxo: TokenUtxo = {
    satoshis: 1,
    txid: "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
    vout: 0,
    script: "base64EncodedScript",
    amt: "1000",
    id: "e6d40ba206340aa94ed40fe1a8adcd722c08c9438b2c1dd16b4527d561e848a2_0",
    payout: "wPs5AAAAAAAZdqkUF/HQ6ktHp6Ab8txx3xBGIs103PyIrA==",
    price: 3800000,
    isListing: true,
  };

  const baseConfig: PurchaseOrdTokenListingConfig = {
    protocol: TokenType.BSV20,
    tokenID: "e6d40ba206340aa94ed40fe1a8adcd722c08c9438b2c1dd16b4527d561e848a2_0",
    utxos,
    paymentPk,
    listingUtxo,
    ordAddress: address,
  };

  test("purchase ord listing with sufficient funds", async () => {
    const { tx, spentOutpoints, payChange } = await purchaseOrdTokenListing(baseConfig);

    expect(tx).toBeInstanceOf(Transaction);
    expect(spentOutpoints).toHaveLength(2); // 1 payment utxo + 1 listing utxo
    expect(payChange).toBeDefined();
  });

  test("purchase ord listing with BSV21 protocol", async () => {
    const bsv21Config = {
      ...baseConfig,
      protocol: TokenType.BSV21,
    };
    const { tx } = await purchaseOrdTokenListing(bsv21Config);

    expect(tx.outputs[0].lockingScript.toHex()).toContain(Buffer.from("bsv-20").toString('hex'));
    expect(tx.outputs[0].lockingScript.toHex()).toContain(Buffer.from("id").toString('hex'));
  });

  test("purchase ord listings with additional payments", async () => {
    const configWithPayments = {
      ...baseConfig,
      additionalPayments: [{ to: address, amount: 1000 }],
    };
    const { tx } = await purchaseOrdTokenListing(configWithPayments);

    expect(tx.outputs).toHaveLength(4); // 1 for ordinal transfer, 1 for payment, 1 additional payment, 1 for change
  });

  test("purchase ord listings with insufficient funds", async () => {
    const insufficientConfig = {
      ...baseConfig,
      utxos: [{ ...utxos[0], satoshis: 1 }],
    };
    await expect(purchaseOrdTokenListing(insufficientConfig)).rejects.toThrow("Not enough funds");
  });
});

describe("purchaseOrdTokenListing", () => {
  const paymentPk = PrivateKey.fromWif("KwE2RgUthyfEZbzrS3EEgSRVr1NodBc9B3vPww6oSGChDuWS6Heb");
  const address = paymentPk.toAddress().toString();

  const utxos: Utxo[] = [{
    satoshis: 9910000,
    txid: "ecb483eda58f26da1b1f8f15b782b1186abdf9c6399a1c3e63e0d429d5092a41",
    vout: 0,
    script: "base64EncodedScript",
  }];

  const listingUtxo: TokenUtxo = {
    satoshis: 1,
    txid: "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
    vout: 0,
    script: "base64EncodedScript",
    amt: "1000",
    id: "e6d40ba206340aa94ed40fe1a8adcd722c08c9438b2c1dd16b4527d561e848a2_0",
    payout: "wPs5AAAAAAAZdqkUF/HQ6ktHp6Ab8txx3xBGIs103PyIrA==",
    price: 3800000,
    isListing: true,
  };

  const baseConfig: PurchaseOrdTokenListingConfig = {
    protocol: TokenType.BSV20,
    tokenID: "e6d40ba206340aa94ed40fe1a8adcd722c08c9438b2c1dd16b4527d561e848a2_0",
    utxos,
    paymentPk,
    listingUtxo,
    ordAddress: address,
  };

  test("purchase ord token listing with sufficient funds", async () => {
    const { tx, spentOutpoints, payChange } = await purchaseOrdTokenListing(baseConfig);

    expect(tx).toBeInstanceOf(Transaction);
    expect(spentOutpoints).toHaveLength(2); // 1 listing, 1 payment utxo
    expect(payChange).toBeDefined();
  });

  test("purchase ord token listing with BSV21 protocol", async () => {
    const bsv21Config = {
      ...baseConfig,
      protocol: TokenType.BSV21,
    };
    const { tx } = await purchaseOrdTokenListing(bsv21Config);

    expect(tx.outputs[0].lockingScript.toHex()).toContain(Buffer.from("bsv-20").toString('hex'));
    expect(tx.outputs[0].lockingScript.toHex()).toContain(Buffer.from("id").toString('hex'));
  });

  test("purchase ord token listing with additional payments", async () => {
    const configWithPayments = {
      ...baseConfig,
      additionalPayments: [{ to: address, amount: 1000 }],
    };
    const { tx } = await purchaseOrdTokenListing(configWithPayments);
    console.log({ txHex: tx.toHex() });
    expect(tx.outputs).toHaveLength(4); // 1 for token transfer, 1 for payment, 1 additional payment, 1 for change
  });

  test("purchase ord token listing with insufficient funds", async () => {
    const insufficientConfig = {
      ...baseConfig,
      utxos: [{ ...utxos[0], satoshis: 1 }],
    };
    await expect(purchaseOrdTokenListing(insufficientConfig)).rejects.toThrow("Not enough funds");
  });
});