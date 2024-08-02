import {
	LockingScript,
	P2PKH,
	Script,
	Utils,
} from "@bsv/sdk";

export const oLockPrefix =
  "2097dfd76851bf465e8f715593b217714858bbe9570ff3bd5e33840a34e20ff0262102ba79df5f8ae7604a9830f03c7933028186aede0675a16f025dc4f8be8eec0382201008ce7480da41702918d1ec8e6849ba32b4d65b1e40dc669c31a1e6306b266c0000";
export const oLockSuffix =
  "615179547a75537a537a537a0079537a75527a527a7575615579008763567901c161517957795779210ac407f0e4bd44bfc207355a778b046225a7068fc59ee7eda43ad905aadbffc800206c266b30e6a1319c66dc401e5bd6b432ba49688eecd118297041da8074ce081059795679615679aa0079610079517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e01007e81517a75615779567956795679567961537956795479577995939521414136d08c5ed2bf3ba048afe6dcaebafeffffffffffffffffffffffffffffff00517951796151795179970079009f63007952799367007968517a75517a75517a7561527a75517a517951795296a0630079527994527a75517a6853798277527982775379012080517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e01205279947f7754537993527993013051797e527e54797e58797e527e53797e52797e57797e0079517a75517a75517a75517a75517a75517a75517a75517a75517a75517a75517a75517a75517a756100795779ac517a75517a75517a75517a75517a75517a75517a75517a75517a7561517a75517a756169587951797e58797eaa577961007982775179517958947f7551790128947f77517a75517a75618777777777777777777767557951876351795779a9876957795779ac777777777777777767006868";

/**
 * OrdP2PKH (1Sat Ordinal + Pay To Public Key Hash) class implementing ScriptTemplate.
 *
 * This class provides methods to create an Ordinal with Pay To Public Key Hash locking and unlocking scripts. 
 * It extends the standard P2PKH script template and provides a custom lock method.
 */
export default class OrdLock {
	/**
	 * Creates a 1Sat Ordinal Lock script
	 *
	 * @param {string} ordAddress - An address which can cancel listing.
	 * @param {string} payAddress - Address which is paid on purchase
	 * @param {number} price - Listing price in satoshis
	 * @returns {LockingScript} - A P2PKH locking script.
	 */
	lock(
		ordAddress: string,
		payAddress: string,
		price: number,
	): Script {
		const cancelPkh = Utils.fromBase58Check(ordAddress).data as number[];
		// const payOut = 
		const priceBuf = Buffer.alloc(34)
		priceBuf.writeBigUint64LE(BigInt(price))

		const payScriptBin = new P2PKH().lock(Utils.fromBase58Check(payAddress).data);
		const payOut = Array.from(priceBuf).concat([25]).concat(payScriptBin.toBinary())

		return Script.fromHex(oLockPrefix)
			.writeBin(cancelPkh)
			.writeBin(payOut)
			.writeScript(Script.fromHex(oLockSuffix))
	}
}
