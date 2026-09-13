import { OrdLockV2 } from "@1sat/templates";
import {
	LockingScript,
	P2PKH,
	type PrivateKey,
	SatoshisPerKilobyte,
	Script,
	Transaction,
	type TransactionOutput,
	Utils,
} from "@bsv/sdk";
import { DEFAULT_SAT_PER_KB } from "./constants";
import OrdLock from "./templates/ordLock";
import OrdP2PKH from "./templates/ordP2pkh";
import {
	type ChangeResult,
	type PurchaseOrdListingConfig,
	type PurchaseOrdTokenListingConfig,
	RoytaltyType,
	TokenType,
	type TransferBSV20Inscription,
	type TransferBSV21Inscription,
	type TransferTokenInscription,
	type Utxo,
} from "./types";
import { resolvePaymail } from "./utils/paymail";
import { inputFromB64Utxo, scriptFromB64 } from "./utils/utxo";

/** Parses a serialized output (8-byte LE satoshis || varint || script). */
const parsePayout = (payout: number[]): TransactionOutput => {
	const reader = new Utils.Reader(payout);
	const satoshis = reader.readUInt64LEBn().toNumber();
	const scriptLength = reader.readVarIntNum();
	return {
		satoshis,
		lockingScript: LockingScript.fromBinary(reader.read(scriptLength)),
	};
};

const utxoAt = (tx: Transaction, vout: number): Utxo => ({
	satoshis: tx.outputs[vout].satoshis as number,
	txid: tx.id("hex") as string,
	vout,
	script: Buffer.from(tx.outputs[vout].lockingScript.toBinary()).toString(
		"base64",
	),
});

type PurchaseParams = {
	utxos: Utxo[];
	paymentPk?: PrivateKey;
	listingUtxo: Utxo;
	/** Serialized payout, base64, for legacy v1 listings (v2 reads it from the script). */
	payout?: string;
	/** The 1-sat output that receives the purchased ordinal. */
	receiveScript: Script;
	changeAddress: string;
	satsPerKb: number;
	/** Outputs appended after the receive (additional payments, royalties). */
	extraOutputs: (price: number) => Promise<TransactionOutput[]>;
	notEnoughFunds: string;
};

/**
 * Assembles and signs a purchase for either listing generation.
 *
 * OrdLock v2 (detected from the listing script) binds the seller payout with
 * SIGHASH_SINGLE, so the payout must sit at the listing's own input index and
 * the listed satoshi must flow, under first-sat ordering, into the receive
 * output. Funding that covers the price is placed AHEAD of the listing input
 * ("front funding"); its remainder comes back as a cushion output at index 0
 * so the sat map lines up:
 *
 *   inputs:  [front funding…][listing][fee funding…]
 *   outputs: [cushion / 0-sat fillers…][payout][receive][extras…][change]
 *
 * Legacy v1 listings keep their original layout:
 *
 *   inputs:  [listing][fee funding…]
 *   outputs: [receive][payout][extras…][change]
 */
const assemblePurchase = async (
	params: PurchaseParams,
): Promise<ChangeResult> => {
	const {
		utxos,
		paymentPk,
		listingUtxo,
		receiveScript,
		changeAddress,
		satsPerKb,
		extraOutputs,
		notEnoughFunds,
	} = params;

	const modelOrFee = new SatoshisPerKilobyte(satsPerKb);
	const tx = new Transaction();
	const listingScript = scriptFromB64(listingUtxo.script);
	const v2 = OrdLockV2.decode(listingScript);

	const p2pkhInput = (utxo: Utxo) => {
		const payKeyToUse = utxo.pk || paymentPk;
		if (!payKeyToUse) {
			throw new Error("Private key is required to sign the payment");
		}
		return inputFromB64Utxo(
			utxo,
			new P2PKH().unlock(
				payKeyToUse,
				"all",
				true,
				utxo.satoshis,
				scriptFromB64(utxo.script),
			),
		);
	};

	let totalSatsIn = BigInt(listingUtxo.satoshis);
	let feeUtxos = utxos;
	let cushionVout = -1;

	if (v2) {
		const payout = OrdLockV2.payoutOutput(listingScript);
		const price = payout.satoshis as number;

		// Front funding: the largest utxos first, until the price is covered.
		// That keeps the leading slot count small and leaves the smaller utxos
		// to pay the fee behind the listing input.
		const front: Utxo[] = [];
		let frontSats = 0;
		for (const utxo of [...utxos].sort((a, b) => b.satoshis - a.satoshis)) {
			if (frontSats >= price) break;
			front.push(utxo);
			frontSats += utxo.satoshis;
		}
		if (frontSats < price) {
			throw new Error(
				`${notEnoughFunds}. Total sats in: ${frontSats}, Listing price: ${price}, Fee: 0`,
			);
		}
		feeUtxos = utxos.filter((u) => !front.includes(u));
		if (feeUtxos.length === 0) {
			throw new Error(
				`${notEnoughFunds}: the front funding remainder must return exactly as a cushion, so the fee needs its own utxo. Provide at least one utxo beyond those covering the ${price} sat price (split one with sendUtxos).`,
			);
		}

		const plan = OrdLockV2.planPurchase({
			frontSatoshis: front.map((u) => u.satoshis),
			listings: [listingScript],
			receives: [{ satoshis: 1, lockingScript: receiveScript }],
			cushionScript: new P2PKH().lock(changeAddress),
		});
		cushionVout = plan.cushionVout;

		for (const utxo of front) {
			tx.addInput(p2pkhInput(utxo));
			totalSatsIn += BigInt(utxo.satoshis);
		}
		tx.addInput(
			inputFromB64Utxo(
				listingUtxo,
				OrdLockV2.purchaseListing(listingUtxo.satoshis, listingScript, {
					deliveries: [
						{ vout: plan.receiveVouts[0], lockingScript: receiveScript },
					],
				}),
			),
		);
		for (const output of plan.outputs) {
			tx.addOutput(output);
		}
		for (const output of await extraOutputs(price)) {
			tx.addOutput(output);
		}
	} else {
		if (!params.payout) {
			throw new Error("Listing UTXO does not have a payout script");
		}
		const payout = parsePayout(Utils.toArray(params.payout, "base64"));

		tx.addInput(
			inputFromB64Utxo(
				listingUtxo,
				new OrdLock().purchaseListing(listingUtxo.satoshis, listingScript),
			),
		);
		tx.addOutput({ satoshis: 1, lockingScript: receiveScript });
		tx.addOutput(payout);
		for (const output of await extraOutputs(payout.satoshis as number)) {
			tx.addOutput(output);
		}
	}

	// add change to the outputs
	const changeOut = {
		lockingScript: new P2PKH().lock(changeAddress),
		change: true,
	};
	tx.addOutput(changeOut);

	const totalSatsOut = tx.outputs.reduce(
		(total, out) => total + BigInt(out.satoshis || 0),
		0n,
	);
	let fee = await modelOrFee.computeFee(tx);
	for (const utxo of feeUtxos) {
		if (totalSatsIn >= totalSatsOut + BigInt(fee)) {
			break;
		}
		tx.addInput(p2pkhInput(utxo));
		totalSatsIn += BigInt(utxo.satoshis);
		fee = await modelOrFee.computeFee(tx);
	}

	// make sure we have enough
	if (totalSatsIn < totalSatsOut + BigInt(fee)) {
		throw new Error(
			`${notEnoughFunds}. Total sats in: ${totalSatsIn}, Total sats out: ${totalSatsOut}, Fee: ${fee}`,
		);
	}

	// estimate the cost of the transaction and assign change value
	await tx.fee(modelOrFee);

	// Sign the transaction
	await tx.sign();

	// check for change
	let payChange: Utxo | undefined;
	const payChangeOutIdx = tx.outputs.findIndex((o) => o.change);
	if (payChangeOutIdx !== -1) {
		payChange = utxoAt(tx, payChangeOutIdx);
	}

	return {
		tx,
		spentOutpoints: tx.inputs.map(
			(i) => `${i.sourceTXID}_${i.sourceOutputIndex}`,
		),
		payChange,
		...(cushionVout !== -1 && { cushion: utxoAt(tx, cushionVout) }),
	};
};

/**
 * Purchase a listing
 * @param {PurchaseOrdListingConfig} config - Configuration object for purchasing a listing
 * @param {Utxo[]} config.utxos - Utxos to spend (with base64 encoded scripts)
 * @param {PrivateKey} config.paymentPk - Private key to sign payment inputs
 * @param {ExistingListing} config.listing - Listing to purchase
 * @param {string} config.ordAddress - Address to send the ordinal to
 * @param {string} [config.changeAddress] - Optional. Address to send change to
 * @param {number} [config.satsPerKb] - Optional. Satoshis per kilobyte for fee calculation
 * @param {Payment[]} [config.additionalPayments] - Optional. Additional payments to make
 * @param {Royalty[]} [config.royalties] - Optional. Royalties to pay
 * @param {MAP} [config.metaData] - Optional. MAP (Magic Attribute Protocol) metadata to include on purchased output
 * @returns {Promise<ChangeResult>} Transaction, spent outpoints, change utxo (and the v2 cushion utxo when present)
 */
export const purchaseOrdListing = async (
	config: PurchaseOrdListingConfig,
): Promise<ChangeResult> => {
	const {
		utxos,
		paymentPk,
		listing,
		ordAddress,
		additionalPayments = [],
		satsPerKb = DEFAULT_SAT_PER_KB,
		royalties = [],
		metaData,
	} = config;

	const changeAddress = config.changeAddress || paymentPk?.toAddress();
	if (!changeAddress) {
		throw new Error("Either changeAddress or paymentPk is required");
	}

	return assemblePurchase({
		utxos,
		paymentPk,
		listingUtxo: listing.listingUtxo,
		payout: listing.payout,
		receiveScript: new OrdP2PKH().lock(ordAddress, undefined, metaData),
		changeAddress,
		satsPerKb,
		notEnoughFunds: "Not enough funds to purchase ordinal listing",
		extraOutputs: async (price) => {
			const outputs: TransactionOutput[] = [];

			// Add additional payments if any
			for (const p of additionalPayments) {
				outputs.push({
					satoshis: p.amount,
					lockingScript: new P2PKH().lock(p.to),
				});
			}

			// Add any royalties
			for (const r of royalties) {
				let lockingScript: LockingScript | undefined;
				const royaltySats = Math.floor(Number(r.percentage) * price);

				switch (r.type as RoytaltyType) {
					case RoytaltyType.Paymail:
						// resolve paymail address
						lockingScript = await resolvePaymail(r.destination, royaltySats);
						break;
					case RoytaltyType.Script:
						lockingScript = Script.fromBinary(
							Utils.toArray(r.destination, "base64"),
						);
						break;
					case RoytaltyType.Address:
						lockingScript = new P2PKH().lock(r.destination);
						break;
					default:
						throw new Error("Invalid royalty type");
				}
				if (!lockingScript) {
					throw new Error("Invalid royalty destination");
				}
				outputs.push({ satoshis: royaltySats, lockingScript });
			}
			return outputs;
		},
	});
};

/**
 *
 * @param {PurchaseOrdTokenListingConfig} config  - Configuration object for purchasing a token listing
 * @param {TokenType} config.protocol - Token protocol
 * @param {string} config.tokenID - Token ID
 * @param {Utxo[]} config.utxos - Utxos to spend (with base64 encoded scripts)
 * @param {PrivateKey} config.paymentPk - Private key to sign payment inputs
 * @param {Utxo} config.listingUtxo - Listing UTXO
 * @param {string} config.ordAddress - Address to send the ordinal to
 * @param {string} [config.changeAddress] - Optional. Address to send change to
 * @param {number} [config.satsPerKb] - Optional. Satoshis per kilobyte for fee calculation
 * @param {Payment[]} [config.additionalPayments] - Optional. Additional payments to make
 * @param {MAP} [config.metaData] - Optional. MAP (Magic Attribute Protocol) metadata to include on the purchased transfer inscription output
 * @returns {Promise<ChangeResult>} Transaction, spent outpoints, change utxo (and the v2 cushion utxo when present)
 */
export const purchaseOrdTokenListing = async (
	config: PurchaseOrdTokenListingConfig,
): Promise<ChangeResult> => {
	const {
		protocol,
		tokenID,
		utxos,
		paymentPk,
		listingUtxo,
		ordAddress,
		satsPerKb = DEFAULT_SAT_PER_KB,
		additionalPayments = [],
		metaData,
	} = config;

	const transferInscription: TransferTokenInscription = {
		p: "bsv-20",
		op: "transfer",
		amt: listingUtxo.amt,
	};
	let inscription: TransferBSV20Inscription | TransferBSV21Inscription;
	if (protocol === TokenType.BSV20) {
		inscription = {
			...transferInscription,
			tick: tokenID,
		} as TransferBSV20Inscription;
	} else if (protocol === TokenType.BSV21) {
		inscription = {
			...transferInscription,
			id: tokenID,
		} as TransferBSV21Inscription;
	} else {
		throw new Error("Invalid protocol");
	}
	const dataB64 = Buffer.from(JSON.stringify(inscription)).toString("base64");

	const changeAddress = config.changeAddress || paymentPk?.toAddress();
	if (!changeAddress) {
		throw new Error("Either changeAddress or paymentPk is required");
	}

	return assemblePurchase({
		utxos,
		paymentPk,
		listingUtxo,
		payout: listingUtxo.payout,
		receiveScript: new OrdP2PKH().lock(
			ordAddress,
			{
				dataB64,
				contentType: "application/bsv-20",
			},
			metaData,
		),
		changeAddress,
		satsPerKb,
		notEnoughFunds: "Not enough funds to purchase token listing",
		extraOutputs: async () =>
			additionalPayments.map((p) => ({
				satoshis: p.amount,
				lockingScript: new P2PKH().lock(p.to),
			})),
	});
};
