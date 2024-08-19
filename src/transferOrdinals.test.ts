import { PrivateKey, Utils } from "@bsv/sdk";
import { transferOrdTokens } from "./transferOrdinals";
import { TokenInputMode, TokenType, type TokenUtxo, type TransferOrdTokensConfig } from "./types";

test("transfer a BSV21", async () => {
  const paymentPk = PrivateKey.fromWif("KzwfqdfecMRtpg65j2BeRtixboNR37fSCDr8QbndV6ySEPT4xibW");
  const ordPk = PrivateKey.fromWif("L5JSAgJJ9CJuAAuWQurYCpwYXpLSMLRZqMyWA5qdey7K2mavVn14")
  const tokenID = "8677c7600eab310f7e5fbbdfc139cc4b168f4d079185facb868ebb2a80728ff1_0";
  const address1 = paymentPk.toAddress().toString();
  const address2 = ordPk.toAddress().toString();

  const utxos = [{
    satoshis: 100000,
    txid: "ecb483eda58f26da1b1f8f15b782b1186abdf9c6399a1c3e63e0d429d5092a41",
    vout: 0,
    script: Buffer.from(Utils.fromBase58Check(address2).data).toString("base64")
  }];

  const inputTokens: TokenUtxo[] = [{
    amt: "5089999991",
    satoshis: 1,
    txid: "47be0be43b42c619c9668244a10409b94db2b307f4c3c6dc30254564c4d57208",
    vout: 0,
    script: Buffer.from("76a914ba82200bb649b316d7a4e5d978b6f5dc5accb46388ac0063036f726451126170706c69636174696f6e2f6273762d3230004c7b7b2270223a226273762d3230222c226f70223a227472616e73666572222c22616d74223a2235303839393939393931222c226964223a22383637376337363030656162333130663765356662626466633133396363346231363866346430373931383566616362383638656262326138303732386666315f30227d68", "hex").toString("base64"),
    id: tokenID,
  }]

  const distributions = [{
    address: address1,
    tokens: 2589999991,
  }, {
    address: address2,
    tokens: 2500000000,
  }];

  const config: TransferOrdTokensConfig = {
    utxos,
    inputTokens,
    distributions,
    paymentPk,
    ordPk,
    protocol: TokenType.BSV20,
    tokenID,
    decimals: 0,
  };

  const { tx } = await transferOrdTokens(config);

  console.log({ txHex: tx.toHex() });
});


test("transfer a BSV21 with split change outputs with minimum threshold", async () => {
  const paymentPk = PrivateKey.fromWif("KzwfqdfecMRtpg65j2BeRtixboNR37fSCDr8QbndV6ySEPT4xibW");
  const ordPk = PrivateKey.fromWif("L5JSAgJJ9CJuAAuWQurYCpwYXpLSMLRZqMyWA5qdey7K2mavVn14")
  const tokenID = "8677c7600eab310f7e5fbbdfc139cc4b168f4d079185facb868ebb2a80728ff1_0";
  const address1 = paymentPk.toAddress().toString();
  const address2 = ordPk.toAddress().toString();

  const utxos = [{
    satoshis: 100000,
    txid: "ecb483eda58f26da1b1f8f15b782b1186abdf9c6399a1c3e63e0d429d5092a41",
    vout: 0,
    script: Buffer.from(Utils.fromBase58Check(address2).data).toString("base64")
  }];

  const inputTokens: TokenUtxo[] = [{
    amt: "5089999991",
    satoshis: 1,
    txid: "47be0be43b42c619c9668244a10409b94db2b307f4c3c6dc30254564c4d57208",
    vout: 0,
    script: Buffer.from("76a914ba82200bb649b316d7a4e5d978b6f5dc5accb46388ac0063036f726451126170706c69636174696f6e2f6273762d3230004c7b7b2270223a226273762d3230222c226f70223a227472616e73666572222c22616d74223a2235303839393939393931222c226964223a22383637376337363030656162333130663765356662626466633133396363346231363866346430373931383566616362383638656262326138303732386666315f30227d68", "hex").toString("base64"),
    id: tokenID,
  }]

  const distributions = [{
    address: address1,
    tokens: 5089999900,
  }, {
    address: address2,
    tokens: 1,
  }];

  const threshold = 30;
  const config: TransferOrdTokensConfig = {
    utxos,
    inputTokens,
    distributions,
    paymentPk,
    ordPk,
    protocol: TokenType.BSV21,
    tokenID,
    decimals: 0,
    tokenInputMode: TokenInputMode.All,
    splitConfig: {
      outputs: 4,
      threshold,
    },
  };

  const { tx, tokenChange } = await transferOrdTokens(config);

  if (!tokenChange) {
    throw new Error("Token change not found");
  }
  
  console.log({ txHex: tx.toHex() });

  // Assertions
  expect(tx.outputs.length).toBe(6); // 2 distributions + 1 payment change + 3 token change
  expect(tokenChange.length).toBe(3);
  
  // Check if the change amounts are correct
  const totalChangeAmount = tokenChange.reduce((sum, change) => sum + BigInt(change.amt), 0n);
  expect(totalChangeAmount).toBe(90n);

  // Check if the change outputs are roughly equal
  const changeAmounts = tokenChange.map(change => BigInt(change.amt));

  // Check if each change output is at least the threshold amount
  for (const amount of changeAmounts) {
    expect(amount).toEqual(BigInt(threshold));
  }
});


test("transfer a BSV21 with split change outputs without threshold", async () => {
  const paymentPk = PrivateKey.fromWif("KzwfqdfecMRtpg65j2BeRtixboNR37fSCDr8QbndV6ySEPT4xibW");
  const ordPk = PrivateKey.fromWif("L5JSAgJJ9CJuAAuWQurYCpwYXpLSMLRZqMyWA5qdey7K2mavVn14")
  const tokenID = "8677c7600eab310f7e5fbbdfc139cc4b168f4d079185facb868ebb2a80728ff1_0";
  const address1 = paymentPk.toAddress().toString();
  const address2 = ordPk.toAddress().toString();

  const utxos = [{
    satoshis: 100000,
    txid: "ecb483eda58f26da1b1f8f15b782b1186abdf9c6399a1c3e63e0d429d5092a41",
    vout: 0,
    script: Buffer.from(Utils.fromBase58Check(address2).data).toString("base64")
  }];

  const inputTokens: TokenUtxo[] = [{
    amt: "5089999991",
    satoshis: 1,
    txid: "47be0be43b42c619c9668244a10409b94db2b307f4c3c6dc30254564c4d57208",
    vout: 0,
    script: Buffer.from("76a914ba82200bb649b316d7a4e5d978b6f5dc5accb46388ac0063036f726451126170706c69636174696f6e2f6273762d3230004c7b7b2270223a226273762d3230222c226f70223a227472616e73666572222c22616d74223a2235303839393939393931222c226964223a22383637376337363030656162333130663765356662626466633133396363346231363866346430373931383566616362383638656262326138303732386666315f30227d68", "hex").toString("base64"),
    id: tokenID,
  }]

  const distributions = [{
    address: address1,
    tokens: 5089999900,
  }, {
    address: address2,
    tokens: 1,
  }];

  const config: TransferOrdTokensConfig = {
    utxos,
    inputTokens,
    distributions,
    paymentPk,
    ordPk,
    protocol: TokenType.BSV21,
    tokenID,
    decimals: 0,
    tokenInputMode: TokenInputMode.All,
    splitConfig: {
      outputs: 4,
    },
  };

  const { tx, tokenChange } = await transferOrdTokens(config);

  if (!tokenChange) {
    throw new Error("Token change not found");
  }
  
  console.log({ txHex: tx.toHex() });

  // Assertions
  expect(tx.outputs.length).toBe(7); // 2 distributions + 1 payment change + 4 token change
  expect(tokenChange.length).toBe(4);
  
  // Check if the change amounts are correct
  const totalChangeAmount = tokenChange.reduce((sum, change) => sum + BigInt(change.amt), 0n);
  expect(totalChangeAmount).toBe(90n);

  // Check if the change outputs are roughly equal
  const changeAmounts = tokenChange.map(change => BigInt(change.amt));
  expect(changeAmounts[0]).toEqual(changeAmounts[1]);
  expect(changeAmounts[2]).toEqual(changeAmounts[3]);

  // Check if each change output is at least the threshold amount
  for (const amount of changeAmounts) {
    expect(amount).toBeGreaterThanOrEqual(22n);
  }
});