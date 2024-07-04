import { type PrivateKey, Transaction } from "@bsv/sdk";
import type { Utxo, Destination, MAP, LocalSigner, RemoteSigner, Payment } from "./types";
export declare const createOrdinals: (utxos: Utxo[], destinations: Destination[], paymentPk: PrivateKey, changeAddress: string, satsPerKb?: number, metaData?: MAP, signer?: LocalSigner | RemoteSigner, additionalPayments?: Payment[]) => Promise<Transaction>;
