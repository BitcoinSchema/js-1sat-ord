import { PrivateKey, Utils } from "@bsv/sdk";
import { deployBsv21Token } from "./deployBsv21";
import type { Utxo, IconInscription } from "./types";
import { ErrorIconProportions, ErrorOversizedIcon } from "./utils/icon";

describe("deployBsv21Token", () => {
  const paymentPk = PrivateKey.fromWif("KzwfqdfecMRtpg65j2BeRtixboNR37fSCDr8QbndV6ySEPT4xibW");
  const address = paymentPk.toAddress().toString();

  const utxos: Utxo[] = [{
    satoshis: 100000,
    txid: "ecb483eda58f26da1b1f8f15b782b1186abdf9c6399a1c3e63e0d429d5092a41",
    vout: 0,
    script: Buffer.from(Utils.fromBase58Check(address).data).toString("base64")
  }];

  const initialDistribution = {
    address: address,
    amt: "1000000000"
  };

  test("deploy BSV21 token with simple SVG icon", async () => {
    const symbol = "TEST";
    const svgIcon: IconInscription = {
      dataB64: Buffer.from('<svg width="100" height="100"><circle cx="50" cy="50" r="40" stroke="black" stroke-width="3" fill="red" /></svg>').toString('base64'),
      contentType: "image/svg+xml"
    };

    const tx = await deployBsv21Token(symbol, svgIcon, utxos, initialDistribution, paymentPk, address);

    expect(tx).toBeDefined();
    expect(tx.toHex()).toBeTruthy();
    console.log({ txHex: tx.toHex() });
  });

  test("deploy BSV21 token with incorrect image proportion", async () => {
    const symbol = "TEST";
    const nonSquareIcon: IconInscription = {
      dataB64: Buffer.from('<svg width="200" height="100"><rect width="200" height="100" style="fill:rgb(0,0,255);" /></svg>').toString('base64'),
      contentType: "image/svg+xml"
    };

    await expect(deployBsv21Token(symbol, nonSquareIcon, utxos, initialDistribution, paymentPk, address))
      .rejects.toThrow(ErrorIconProportions.message);
  });

  test("deploy BSV21 token with oversized image", async () => {
    const symbol = "TEST";
    const oversizedIcon: IconInscription = {
      dataB64: Buffer.from('<svg width="500" height="500"><circle cx="250" cy="250" r="200" stroke="black" stroke-width="3" fill="blue" /></svg>').toString('base64'),
      contentType: "image/svg+xml"
    };

    await expect(deployBsv21Token(symbol, oversizedIcon, utxos, initialDistribution, paymentPk, address))
      .rejects.toThrow(ErrorOversizedIcon.message);
  });
});