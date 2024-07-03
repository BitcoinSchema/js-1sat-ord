import { type PrivateKey, Transaction } from "@bsv/sdk";
import type { Utxo, Destination, MAP, Payment } from "./types";
export declare const sendOrdinals: (paymentUtxos: Utxo[], ordinals: Utxo[], paymentPk: PrivateKey, changeAddress: string, ordPk: PrivateKey, destinations: Destination[], satsPerKb?: number, metaData?: MAP, additionalPayments?: Payment[]) => Promise<Transaction>;
