// TODO: Purchase listing

import { P2PKH, SatoshisPerKilobyte, Script, Transaction } from "@bsv/sdk";
import { DEFAULT_SAT_PER_KB } from "./constants"
import type { PurchaseOrdListingConfig, Utxo } from "./types";
import { inputFromB64Utxo } from "./utils/utxo";

export const purchaseOrdListings = async (config: PurchaseOrdListingConfig) => {
const { utxos, 
  paymentPk, 
  listingUtxo, 
  ordAddress,
  changeAddress,
  additionalPayments = [],
  satsPerKb = DEFAULT_SAT_PER_KB } = config;

  const modelOrFee = new SatoshisPerKilobyte(satsPerKb);
	const tx = new Transaction();
  
  // Inputs
  // Add the locked ordinal we're purchasing
  tx.addInput({
    unlockingScript: Script.fromHex(Buffer.from(listingUtxo.script, 'base64').toString('hex')),
    sourceOutputIndex: listingUtxo.vout,
    sequence: 0xffffffff,
  });
	
  // Add payments
  for (const utxo of utxos) {
		const input = inputFromB64Utxo(utxo, new P2PKH().unlock(paymentPk));
		tx.addInput(input);
	}

  // Outputs
  // Add the purchased output
  tx.addOutput({
    satoshis: 1,
    lockingScript: new P2PKH().lock(ordAddress),
  });

  	// Add additional payments if any
	for (const p of additionalPayments) {
		tx.addOutput({
			satoshis: p.amount,
			lockingScript: new P2PKH().lock(p.to),
		});
	}
  

	// Calculate total input and output amounts
	const totalInput = utxos.reduce(
		(sum, utxo) => sum + BigInt(utxo.satoshis),
		0n,
	);
	const totalOutput = tx.outputs.reduce(
		(sum, output) => sum + BigInt(output.satoshis || 0),
		0n,
	);

	// Estimate fee
	const estimatedFee = await modelOrFee.computeFee(tx);

  // Check if change is needed
	let payChange: Utxo | undefined;
	if (totalInput > totalOutput + BigInt(estimatedFee)) {
		const changeScript = new P2PKH().lock(
			changeAddress || paymentPk.toAddress().toString(),
		);
		const changeOutput = {
			lockingScript: changeScript,
			change: true,
		};
		// Add change output
		payChange = {
			txid: "", // txid is not known yet,
			vout: tx.outputs.length,
			satoshis: 0, // change output amount is not known yet
			script: Buffer.from(changeScript.toHex(), "hex").toString("base64"),
		};

    
		tx.addOutput(changeOutput);
	}

  	// Calculate fee
	await tx.fee(modelOrFee);

  // Sign the transaction
	await tx.sign();

	if (payChange) {
		const changeOutput = tx.outputs[tx.outputs.length - 1];
		payChange.satoshis = changeOutput.satoshis as number;
		payChange.txid = tx.id("hex") as string;
	}

  return {
		tx,
		spentOutpoints: utxos.map((utxo) => `${utxo.txid}_${utxo.vout}`),
		payChange,
	};

}
  // create a transaction that will purchase the artifact, once funded
  // const purchaseTx = new Transaction(1, 0);

  // const listingInput = new TxIn(
  //   Buffer.from(listing.txid, "hex"),
  //   listing.vout,
  //   Script.from_asm_string("")
  // );
  // purchaseTx.add_input(listingInput);
  // const spentOutpoints = [listing.outpoint];

  // // output 0 - purchasing the ordinal
  // const buyerOutput = new TxOut(
  //   BigInt(1),
  //   P2PKHAddress.from_string(ordAddress.value!).get_locking_script()
  // );
  // purchaseTx.add_output(buyerOutput);

  // const ordPayout = (listing as OrdUtxo).data?.list?.payout;
  // const listingPayout = (listing as Listing).payout;
  // const listingScript = (listing as Listing).script;
  // if (!listing.script) {
  //   const results = await getOutpoints([listing.outpoint], true);
  //   if (results?.[0]) {
  //     listing.script = results[0].script;
  //   }
  // }
  // const ordScript = (listing as OrdUtxo).script;

  // // output 1
  // const payOutput = TxOut.from_hex(
  //   Buffer.from(listingPayout || ordPayout!, "base64").toString(
  //     "hex"
  //   )
  // );
  // purchaseTx.add_output(payOutput);

  // const changeAddress = P2PKHAddress.from_string(
  //   fundingAddress.value!
  // );
  // // const ordinalsAddress = P2PKHAddress.from_string(ordAddress.value!);

  // // const isBsv20Listing = (listing as Listing).tick !== undefined;

  // // dummy outputs - change
  // const dummyChangeOutput = new TxOut(
  //   BigInt(0),
  //   changeAddress.get_locking_script()
  // );
  // purchaseTx.add_output(dummyChangeOutput);

  // // output 3 - marketFee
  // const dummyMarketFeeOutput = new TxOut(
  //   BigInt(0),
  //   P2PKHAddress.from_string(marketAddress).get_locking_script()
  // );
  // purchaseTx.add_output(dummyMarketFeeOutput);

  // // this has to be "InputOutput" and then second time is InputOutputs
  // let preimage = purchaseTx.sighash_preimage(
  //   SigHash.InputOutput,
  //   0,
  //   Script.from_bytes(
  //     Buffer.from(listingScript || ordScript, "base64")
  //   ),
  //   BigInt(1) //TODO: use amount from listing
  // );
  // listingInput.set_unlocking_script(
  //   Script.from_asm_string(
  //     `${purchaseTx.get_output(0)!.to_hex()} ${purchaseTx
  //       .get_output(2)!
  //       .to_hex()}${purchaseTx
  //         .get_output(3)!
  //         .to_hex()} ${Buffer.from(preimage).toString(
  //           "hex"
  //         )} OP_0`
  //   )
  // );
  // purchaseTx.set_input(0, listingInput);
  // // calculate market fee
  // let marketFee = Number(price) * marketRate;
  // if (marketFee === 0) {
  //   marketFee = minimumMarketFee;
  // }
  // const marketFeeOutput = new TxOut(
  //   BigInt(Math.ceil(marketFee)),
  //   P2PKHAddress.from_string(marketAddress).get_locking_script()
  // );
  // purchaseTx.set_output(3, marketFeeOutput);

  // // Calculate the network fee
  // // account for funding input and market output (not added to tx yet)
  // const paymentUtxos: Utxo[] = [];
  // let satsCollected = 0n;
  // // initialize fee and satsNeeded (updated with each added payment utxo)
  // let fee = calculateFee(1, purchaseTx);
  // let satsNeeded = BigInt(fee) + price + BigInt(marketFee);
  // // collect the required utxos
  // const sortedFundingUtxos = utxos.value!.sort((a, b) =>
  //   a.satoshis > b.satoshis ? -1 : 1
  // );
  // for (const utxo of sortedFundingUtxos) {
  //   if (satsCollected < satsNeeded) {
  //     satsCollected += BigInt(utxo.satoshis);
  //     paymentUtxos.push(utxo);

  //     // if we had to add additional
  //     fee = calculateFee(paymentUtxos.length, purchaseTx);
  //     satsNeeded = BigInt(fee) + price + BigInt(marketFee);
  //   } else {
  //     break;
  //   }
  // }

  // // if you still dont have enough
  // if (satsCollected < satsNeeded) {
  //   toast.error("Insufficient funds", toastErrorProps);
  //   return;
  // }

  // // Replace dummy change output
  // const changeAmt = satsCollected - satsNeeded;

  // const changeOutput = new TxOut(
  //   changeAmt,
  //   changeAddress.get_locking_script()
  // );

  // purchaseTx.set_output(2, changeOutput);

  // preimage = purchaseTx.sighash_preimage(
  //   SigHash.InputOutputs,
  //   0,
  //   Script.from_bytes(
  //     Buffer.from(listingScript || ordScript, "base64")
  //   ),
  //   BigInt(1)
  // );

  // listingInput.set_unlocking_script(
  //   Script.from_asm_string(
  //     `${purchaseTx.get_output(0)!.to_hex()} ${purchaseTx
  //       .get_output(2)!
  //       .to_hex()}${purchaseTx
  //         .get_output(3)!
  //         .to_hex()} ${Buffer.from(preimage).toString(
  //           "hex"
  //         )} OP_0`
  //   )
  // );
  // purchaseTx.set_input(0, listingInput);

  // // create and sign inputs (payment)
  // const paymentPk = PrivateKey.from_wif(payPk.value!);

  // paymentUtxos.forEach((utxo, idx) => {
  //   const fundingInput = new TxIn(
  //     Buffer.from(utxo.txid, "hex"),
  //     utxo.vout,
  //     Script.from_asm_string(utxo.script)
  //   );
  //   purchaseTx.add_input(fundingInput);
  //   spentOutpoints.push(`${utxo.txid}_${utxo.vout}`);
    
  //   const sig = purchaseTx.sign(
  //     paymentPk,
  //     SigHash.InputOutputs,
  //     1 + idx,
  //     Script.from_asm_string(utxo.script),
  //     BigInt(utxo.satoshis)
  //   );

  //   fundingInput.set_unlocking_script(
  //     Script.from_asm_string(
  //       `${sig.to_hex()} ${paymentPk.to_public_key().to_hex()}`
  //     )
  //   );

  //   purchaseTx.set_input(1 + idx, fundingInput);
  // });