import { describe, expect, test } from "bun:test";
import { PrivateKey } from "@bsv/sdk";
import { createOrdListings, createOrdTokenListings } from "./createListings";
import { ORDLOCK_CREATE_DISABLED } from "./templates/ordLock";
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

  test("createOrdListings — listing creation is deprecated", async () => {
    await expect(createOrdListings(baseConfig)).rejects.toThrow(ORDLOCK_CREATE_DISABLED);
    await expect(createOrdListings(baseConfig)).rejects.toThrow(
      /OrdLock listing creation is deprecated/,
    );
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
    tokens: 1000,
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

  test("createOrdTokenListings — listing creation is deprecated", async () => {
    await expect(createOrdTokenListings(baseConfig)).rejects.toThrow(ORDLOCK_CREATE_DISABLED);
    await expect(createOrdTokenListings(baseConfig)).rejects.toThrow(
      /OrdLock listing creation is deprecated/,
    );
  });
});
