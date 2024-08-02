// TODO: Create listing for NFT and FT

import type { CraeteOrdTokensListingsConfig, CreateListingsConfig } from "./types";


export const createOrdListings = async (config: CreateOrdListingsConfig) => {

}

export const createOrdTokenListings = async (config: CraeteOrdTokenListingsConfig) {
  
}

// const listOrdinal = useCallback(
//   async (
//     paymentUtxo: Utxo,
//     ordinal: OrdUtxo,
//     paymentPk: PrivateKey,
//     changeAddress: string,
//     ordPk: PrivateKey,
//     ordAddress: string,
//     payoutAddress: string,
//     satoshisPayout: number
//   ): Promise<PendingTransaction> => {
//     const tx = new Transaction(1, 0);
//     const t = ordinal.txid;
//     const txBuf = Buffer.from(t, "hex");
//     const ordIn = new TxIn(
//       txBuf,
//       ordinal.vout,
//       Script.from_asm_string("")
//     );
//     tx.add_input(ordIn);
//     const spentOutpoints = [`${ordinal.txid}_${ordinal.vout}`]

//     // Inputs
//     let utxoIn = new TxIn(
//       Buffer.from(paymentUtxo.txid, "hex"),
//       paymentUtxo.vout,
//       Script.from_asm_string("")
//     );

//     tx.add_input(utxoIn);
//     spentOutpoints.push(`${paymentUtxo.txid}_${paymentUtxo.vout}`)

//     const payoutDestinationAddress =
//       P2PKHAddress.from_string(payoutAddress);
//     const payOutput = new TxOut(
//       BigInt(satoshisPayout),
//       payoutDestinationAddress.get_locking_script()
//     );

//     const destinationAddress = P2PKHAddress.from_string(ordAddress);
//     const addressHex = destinationAddress
//       .get_locking_script()
//       .to_asm_string()
//       .split(" ")[2];

//     const ordLockScript = `${Script.from_hex(
//       oLockPrefix
//     ).to_asm_string()} ${addressHex} ${payOutput.to_hex()} ${Script.from_hex(
//       oLockSuffix
//     ).to_asm_string()}`;

//     const satOut = new TxOut(
//       BigInt(1),
//       Script.from_asm_string(ordLockScript)
//     );
//     tx.add_output(satOut);

//     const changeOut = createChangeOutput(
//       tx,
//       changeAddress,
//       paymentUtxo.satoshis
//     );
//     tx.add_output(changeOut);

//     // if (!ordinal.script) {
//     // 	const ordRawTx = await getRawTxById(ordinal.txid);
//     // 	const tx = Transaction.from_hex(ordRawTx);
//     // 	console.log({ num: tx.get_noutputs() });
//     // 	const out = tx.get_output(ordinal.vout);
//     // 	ordinal.satoshis = Number(out?.get_satoshis());

//     // 	const script = out?.get_script_pub_key();
//     // 	if (script) {
//     // 		ordinal.script = script.to_asm_string();
//     // 	}
//     // }

//     // sign ordinal
//     const sig = tx.sign(
//       ordPk,
//       SigHash.ALL | SigHash.FORKID,
//       0,
//       Script.from_bytes(Buffer.from(ordinal.script, "base64")),
//       BigInt(ordinal.satoshis)
//     );

//     ordIn.set_unlocking_script(
//       Script.from_asm_string(
//         `${sig.to_hex()} ${ordPk.to_public_key().to_hex()}`
//       )
//     );

//     tx.set_input(0, ordIn);

//     utxoIn = signPayment(tx, paymentPk, 1, paymentUtxo, utxoIn);
//     tx.set_input(1, utxoIn);

//     return {
//       rawTx: tx.to_hex(),
//       size: tx.get_size(),
//       fee: paymentUtxo.satoshis - Number(tx.satoshis_out()),
//       numInputs: tx.get_ninputs(),
//       numOutputs: tx.get_noutputs(),
//       txid: tx.get_id_hex(),
//       spentOutpoints,
//       marketFee: 0,
//     };
//   },
//   []
// );
