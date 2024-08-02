// TODO: Create listing for NFT and FT

import { P2PKH, SatoshisPerKilobyte, Transaction } from "@bsv/sdk";
import { DEFAULT_SAT_PER_KB } from "./constants";
import type { CraeteOrdTokenListingsConfig, CreateOrdListingsConfig, Utxo } from "./types";
import { inputFromB64Utxo } from "./utils/utxo";
import OrdLock from "./templates/ordLock";


export const createOrdListings = async (config: CreateOrdListingsConfig) => {
	const {
		utxos,
		listings,
		paymentPk,
		changeAddress,
		satsPerKb = DEFAULT_SAT_PER_KB,
		additionalPayments = [],
	} = config;

  const modelOrFee = new SatoshisPerKilobyte(satsPerKb);
	const tx = new Transaction();
  
  	// Inputs
	for (const utxo of utxos) {
		const input = inputFromB64Utxo(utxo, new P2PKH().unlock(paymentPk));
		tx.addInput(input);
	}

  	// Warn if creating many inscriptions at once
	if (listings.length > 100) {
		console.warn(
			"Creating many inscriptions at once can be slow. Consider using multiple transactions instead.",
		);
	}

  // Outputs
  // Add listing outputs
  for (const listing of listings) {
    tx.addOutput({
      satoshis: 1,
      lockingScript: new OrdLock().lock(listing.payAddress, listing.ordAddress, listing.price)
    })
  }

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

export const createOrdTokenListings = async (config: CraeteOrdTokenListingsConfig) => {
  
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
