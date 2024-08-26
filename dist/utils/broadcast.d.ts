import { type BroadcastFailure, type Broadcaster, type BroadcastResponse, type Transaction, type HttpClient } from "@bsv/sdk";
export declare const oneSatBroadcaster: () => Broadcaster;
/**
 * Represents a 1Sat API transaction broadcaster. This will broadcast through the 1Sat API.
 */
export default class OneSatBroadcaster implements Broadcaster {
    private readonly URL;
    private readonly httpClient;
    /**
     * Constructs an instance of the 1Sat API broadcaster.
     *
     * @param {HttpClient} httpClient - The HTTP client used to make requests to the API.
     */
    constructor(httpClient?: HttpClient);
    /**
     * Broadcasts a transaction via WhatsOnChain.
     *
     * @param {Transaction} tx - The transaction to be broadcasted.
     * @returns {Promise<BroadcastResponse | BroadcastFailure>} A promise that resolves to either a success or failure response.
     */
    broadcast(tx: Transaction): Promise<BroadcastResponse | BroadcastFailure>;
}
