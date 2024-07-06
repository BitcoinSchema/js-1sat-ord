import { P2PKH, PrivateKey, Utils } from "@bsv/sdk";
import { sendUtxos, type SendUtxosConfig } from "./sendUtxos";
import type { Utxo, Payment } from "./types";

describe("sendUtxos", () => {
  const paymentPk = PrivateKey.fromWif("KzwfqdfecMRtpg65j2BeRtixboNR37fSCDr8QbndV6ySEPT4xibW");
  const address = paymentPk.toAddress().toString();

  const insufficientUtxos: Utxo[] = [{
    satoshis: 5,
    txid: "ecb483eda58f26da1b1f8f15b782b1186abdf9c6399a1c3e63e0d429d5092a41",
    vout: 0,
    script: Buffer.from(new P2PKH().lock(address).toHex(), 'hex').toString('base64'),
  }];

  const exactUtxos: Utxo[] = [{
    satoshis: 12,
    txid: "ecb483eda58f26da1b1f8f15b782b1186abdf9c6399a1c3e63e0d429d5092a41",
    vout: 0,
    script: Buffer.from(new P2PKH().lock(address).toHex(), 'hex').toString('base64'),
  }];

  const sufficientUtxos: Utxo[] = [{
    satoshis: 15,
    txid: "ecb483eda58f26da1b1f8f15b782b1186abdf9c6399a1c3e63e0d429d5092a41",
    vout: 0,
    script: Buffer.from(new P2PKH().lock(address).toHex(), 'hex').toString('base64'),
  }];

  const payments: Payment[] = [{
    to: "1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2",
    amount: 10
  }];

  const baseConfig: SendUtxosConfig = {
    utxos: sufficientUtxos,
    paymentPk,
    payments,
  };

  test("send utxos with a sufficient utxo", async () => {
    const { tx, spentOutpoints, payChangeVout } = await sendUtxos(baseConfig);

    expect(tx).toBeDefined();
    expect(tx.toHex()).toBeTruthy();
    expect(spentOutpoints).toEqual(["ecb483eda58f26da1b1f8f15b782b1186abdf9c6399a1c3e63e0d429d5092a41_0"]);
    expect(payChangeVout).toBe(1);
    expect(tx.outputs.length).toBe(2);
    console.log({ txHex: tx.toHex() });
  });

  test("send utxos with an exact utxo", async () => {
    const config = { ...baseConfig, utxos: exactUtxos };
    const { tx, spentOutpoints, payChangeVout } = await sendUtxos(config);

    expect(tx).toBeDefined();
    expect(tx.toHex()).toBeTruthy();
    expect(spentOutpoints).toEqual(["ecb483eda58f26da1b1f8f15b782b1186abdf9c6399a1c3e63e0d429d5092a41_0"]);
    expect(payChangeVout).toBeUndefined();
    expect(tx.outputs.length).toBe(1);
    console.log({ txHex: tx.toHex() });
  });

  test("send utxos with insufficient utxo", async () => {
    const config = { ...baseConfig, utxos: insufficientUtxos };
    await expect(sendUtxos(config)).rejects.toThrow("Not enough funds");
  });
});