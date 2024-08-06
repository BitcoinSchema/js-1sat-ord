import { PaymailClient } from "@bsv/paymail";
import { LockingScript } from "@bsv/sdk";

const client = new PaymailClient();

export const resolvePaymail = async (paymailAddress: string, amtToReceive: number): Promise<LockingScript> => {
  const destinationTx = await client.getP2pPaymentDestination(paymailAddress, amtToReceive);
  // TODO: we are assuming only one output but in reality it can be many
  return destinationTx.outputs[0].script as LockingScript;
}