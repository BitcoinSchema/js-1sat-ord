import { P2PKH, PrivateKey } from "@bsv/sdk";
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { deployBsv21Token } from "./deployBsv21";
import type { DeployBsv21TokenConfig, IconInscription, Utxo } from "./types";
import { ErrorIconProportions, ErrorImageDimensionsUndefined, ErrorOversizedIcon } from "./utils/icon";

describe("deployBsv21Token", () => {
  const paymentPk = PrivateKey.fromWif("KzwfqdfecMRtpg65j2BeRtixboNR37fSCDr8QbndV6ySEPT4xibW");
  const address = paymentPk.toAddress().toString();

  const insufficientUtxos: Utxo[] = [{
    satoshis: 6,
    txid: "ecb483eda58f26da1b1f8f15b782b1186abdf9c6399a1c3e63e0d429d5092a41",
    vout: 0,
    script: Buffer.from(new P2PKH().lock(address).toHex(), 'hex').toString('base64'),
  }];

  const exactUtxos: Utxo[] = [{
    satoshis: 7,
    txid: "ecb483eda58f26da1b1f8f15b782b1186abdf9c6399a1c3e63e0d429d5092a41",
    vout: 0,
    script: Buffer.from(new P2PKH().lock(address).toHex(), 'hex').toString('base64'),
  }];

  const sufficientUtxos: Utxo[] = [{
    satoshis: 30,
    txid: "ecb483eda58f26da1b1f8f15b782b1186abdf9c6399a1c3e63e0d429d5092a41",
    vout: 0,
    script: Buffer.from(new P2PKH().lock(address).toHex(), 'hex').toString('base64'),
  }];

  const initialDistribution = {
    address: address,
    amt: 1000000000,
  };

  const symbol = "TEST";
  const svgIcon: IconInscription = {
    dataB64: Buffer.from('<svg width="100" height="100"><circle cx="50" cy="50" r="40" stroke="black" stroke-width="3" fill="red" /></svg>').toString('base64'),
    contentType: "image/svg+xml"
  };

  const baseConfig: DeployBsv21TokenConfig = {
    symbol,
    icon: svgIcon,
    utxos: sufficientUtxos,
    initialDistribution,
    paymentPk,
    destinationAddress: address,
  };

  test("deploy BSV21 token with a sufficient utxo", async () => {
    const { tx } = await deployBsv21Token(baseConfig);

    expect(tx).toBeDefined();
    expect(tx.toHex()).toBeTruthy();
    // expect change
    expect(tx.outputs.length).toBe(3);
    console.log({ txHex: tx.toHex() });
  });

  test("deploy BSV21 token with an exact utxo", async () => {
    const config = { ...baseConfig, utxos: exactUtxos };
    const { tx } = await deployBsv21Token(config);

    expect(tx).toBeDefined();
    expect(tx.toHex()).toBeTruthy();
    // expect no change output
    expect(tx.outputs.length).toBe(2);
    console.log({ txHex: tx.toHex() });
  });

  test("deploy BSV21 token with a insufficient utxo", async () => {
    const config = { ...baseConfig, utxos: insufficientUtxos };
    // expect this to throw an error
    await expect(deployBsv21Token(config)).rejects.toThrow();
  });

  test("deploy BSV21 token with sufficient utxos", async () => {
    const { tx } = await deployBsv21Token(baseConfig);

    expect(tx).toBeDefined();
    expect(tx.toHex()).toBeTruthy();
    console.log({ txHex: tx.toHex() });
  });

  test("deploy BSV21 token with incorrect image proportion", async () => {
    const nonSquareIcon: IconInscription = {
      dataB64: Buffer.from('<svg width="200" height="100"><rect width="200" height="100" style="fill:rgb(0,0,255);" /></svg>').toString('base64'),
      contentType: "image/svg+xml"
    };
    const config = { ...baseConfig, icon: nonSquareIcon };

    await expect(deployBsv21Token(config)).rejects.toThrow(ErrorIconProportions.message);
  });

  test("deploy BSV21 token with oversized image", async () => {
    const oversizedIcon: IconInscription = {
      dataB64: Buffer.from('<svg width="500" height="500"><circle cx="250" cy="250" r="200" stroke="black" stroke-width="3" fill="blue" /></svg>').toString('base64'),
      contentType: "image/svg+xml"
    };
    const config = { ...baseConfig, icon: oversizedIcon };

    await expect(deployBsv21Token(config)).rejects.toThrow(ErrorOversizedIcon.message);
  });

  test("deploy BSV21 token with SVG missing dimensions", async () => {
    const invalidSvgIcon: IconInscription = {
      dataB64: Buffer.from('<svg><rect width="100" height="100" style="fill:rgb(0,0,255);" /></svg>').toString('base64'),
      contentType: "image/svg+xml"
    };
    const config = { ...baseConfig, icon: invalidSvgIcon };

    await expect(deployBsv21Token(config)).rejects.toThrow(ErrorImageDimensionsUndefined.message);
  });

  test("deploy BSV21 token with SVG non-numeric dimensions", async () => {
    const invalidSvgIcon: IconInscription = {
      dataB64: Buffer.from('<svg width="auto" height="auto"><rect width="100" height="100" style="fill:rgb(0,0,255);" /></svg>').toString('base64'),
      contentType: "image/svg+xml"
    };
    const config = { ...baseConfig, icon: invalidSvgIcon };

    await expect(deployBsv21Token(config)).rejects.toThrow(ErrorImageDimensionsUndefined.message);
  });

  test("deploy BSV21 token with valid square SVG", async () => {
    const validSvgIcon: IconInscription = {
      dataB64: Buffer.from('<svg width="300" height="300"><rect width="300" height="300" style="fill:rgb(0,0,255);" /></svg>').toString('base64'),
      contentType: "image/svg+xml"
    };
    const config = { ...baseConfig, icon: validSvgIcon };

    const { tx } = await deployBsv21Token(config);
    expect(tx).toBeDefined();
    expect(tx.toHex()).toBeTruthy();
  });

  test("deploy BSV21 token with valid PNG", async () => {
    const pngBuffer = readFileSync(join(__dirname, 'testdata', 'valid_300x300.png'));
    const validPngIcon: IconInscription = {
      dataB64: pngBuffer.toString('base64'),
      contentType: "image/png"
    };
    const config = { ...baseConfig, icon: validPngIcon };

    const { tx } = await deployBsv21Token(config);
    expect(tx).toBeDefined();
    expect(tx.toHex()).toBeTruthy();
  });

  test("deploy BSV21 token with invalid PNG dimensions", async () => {
    const pngBuffer = readFileSync(join(__dirname, 'testdata', 'invalid_400x300.png'));
    const invalidPngIcon: IconInscription = {
      dataB64: pngBuffer.toString('base64'),
      contentType: "image/png"
    };
    const config = { ...baseConfig, icon: invalidPngIcon };

    await expect(deployBsv21Token(config)).rejects.toThrow(ErrorIconProportions.message);
  });
});