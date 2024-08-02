// TODO: Cancel listing for NFT and FT

import type { CancelOrdListingsConfig } from "./types"

export const cancelOrdListings = async (config: CancelOrdListingsConfig) => {
const { utxos, listingScript, ordPk, paymentPk } = config


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