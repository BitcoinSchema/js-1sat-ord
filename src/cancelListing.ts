// TODO: Cancel listing for NFT and FT

import { P2PKH, SatoshisPerKilobyte, Script, Transaction } from "@bsv/sdk";
import type { CancelOrdListingsConfig, Utxo } from "./types"
import { inputFromB64Utxo } from "./utils/utxo";
import { DEFAULT_SAT_PER_KB } from "./constants";
import OrdLock from "./templates/ordLock";

export const cancelOrdListings = async (config: CancelOrdListingsConfig) => {
const { utxos, listingUtxos, ordPk, paymentPk, changeAddress, satsPerKb = DEFAULT_SAT_PER_KB } = config

const modelOrFee = new SatoshisPerKilobyte(satsPerKb);
const tx = new Transaction();

  // Inputs
  // Add the locked ordinals we're cancelling
for (const listingUtxo of listingUtxos) {

  tx.addInput({
    unlockingScript: Script.fromHex(Buffer.from(listingUtxo.script, 'base64').toString('hex')),
    unlockingScriptTemplate: new OrdLock().cancelListing(ordPk),
    sourceOutputIndex: listingUtxo.vout,
    sequence: 0xffffffff,
  })
}

  for (const utxo of utxos) {
    const input = inputFromB64Utxo(utxo, new P2PKH().unlock(paymentPk));
    tx.addInput(input);
  }

  // Warn if creating many inscriptions at once
  if (listingUtxos.length > 100) {
    console.warn(
      "Creating many inscriptions at once can be slow. Consider using multiple transactions instead.",
    );
  }

  // Outputs
  // Add cancel outputs returning listed ordinals
  for (const _ of listingUtxos) {
    tx.addOutput({
      satoshis: 1,
      lockingScript: new P2PKH().lock(ordPk.toAddress().toString()),
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

// const cancelTx = new Transaction(1, 0);

// if (listing.id || listing.tick) {
//   cancelling.value = false;
//   throw new Error("BSV20 listing!");
// }

// const cancelInput = new TxIn(
//   Buffer.from(listing.txid, "hex"),
//   listing.vout,
//   Script.from_asm_string("")
// );
// cancelTx.add_input(cancelInput);
// const ordinalsAddress = P2PKHAddress.from_string(ordAddress.value);

// const satOutScript = ordinalsAddress.get_locking_script();
// const transferOut = new TxOut(BigInt(1), satOutScript);

// cancelTx.add_output(transferOut);

// const changeAddress = P2PKHAddress.from_string(fundingAddress.value);

// // dummy outputs - change
// const dummyChangeOutput = new TxOut(
//   BigInt(0),
//   changeAddress.get_locking_script()
// );
// cancelTx.add_output(dummyChangeOutput);

// // Calculate the network fee
// // account for funding input and market output (not added to tx yet)
// const paymentUtxos: Utxo[] = [];
// let satsCollected = 0;
// // initialize fee and satsNeeded (updated with each added payment utxo)
// let fee = calculateFee(1, cancelTx);
// let satsNeeded = fee;
// // collect the required utxos
// const sortedFundingUtxos = utxos.value.sort((a, b) =>
//   a.satoshis > b.satoshis ? -1 : 1
// );
// for (const utxo of sortedFundingUtxos) {
//   if (satsCollected < satsNeeded) {
//     satsCollected += utxo.satoshis;
//     paymentUtxos.push(utxo);

//     // if we had to add additional
//     fee = calculateFee(paymentUtxos.length, cancelTx);
//     satsNeeded = fee + BigInt(indexerBuyFee);
//   }
// }

// // add payment utxos to the tx
// for (const u of paymentUtxos) {
//   const inx = new TxIn(
//     Buffer.from(u.txid, "hex"),
//     u.vout,
//     Script.from_asm_string("")
//   );
//   inx.set_satoshis(BigInt(u.satoshis));
//   cancelTx.add_input(inx);
// }

// // Replace dummy change output
// const changeAmt = BigInt(satsCollected) - satsNeeded;

// const changeOutput = new TxOut(
//   BigInt(changeAmt),
//   changeAddress.get_locking_script()
// );

// cancelTx.set_output(1, changeOutput);

// // sign the cancel input
// const sig = cancelTx.sign(
//   PrivateKey.from_wif(ordPk.value),
//   SigHash.InputOutputs,
//   0,
//   Script.from_bytes(Buffer.from(listing.script, "base64")),
//   BigInt(1)
// );

// cancelInput.set_unlocking_script(
//   Script.from_asm_string(
//     `${sig.to_hex()} ${PrivateKey.from_wif(ordPk.value)
//       .to_public_key()
//       .to_hex()} OP_1`
//   )
// );

// cancelTx.set_input(0, cancelInput);

// // sign the funding inputs
// let idx = 1;
// for (const u of paymentUtxos) {
//   const inx = cancelTx.get_input(idx);

//   if (!inx) {
//     cancelling.value = false;
//     return;
//   }

//   const sig = cancelTx.sign(
//     PrivateKey.from_wif(payPk.value),
//     SigHash.InputOutputs,
//     idx,
//     Script.from_asm_string(u.script),
//     BigInt(u.satoshis)
//   );

//   inx.set_unlocking_script(
//     Script.from_asm_string(
//       `${sig.to_hex()} ${PrivateKey.from_wif(payPk.value)
//         .to_public_key()
//         .to_hex()}`
//     )
//   );

//   cancelTx.set_input(idx, inx);
//   idx++;
// }