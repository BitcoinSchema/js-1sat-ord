import {
	ARC,
	type BroadcastFailure,
	type Broadcaster,
	type BroadcastResponse,
	type Transaction,
	type HttpClient,
	defaultHttpClient,
  Utils,
} from "@bsv/sdk";
import { API_HOST } from "../constants.js";

export const oneSatBroadcaster = (): Broadcaster => {
	return new OneSatBroadcaster();
};

/**
 * Represents a 1Sat API transaction broadcaster. This will broadcast through the 1Sat API.
 */
export default class OneSatBroadcaster implements Broadcaster {
	private readonly URL: string;
	private readonly httpClient: HttpClient;

	/**
	 * Constructs an instance of the 1Sat API broadcaster.
	 *
	 * @param {HttpClient} httpClient - The HTTP client used to make requests to the API.
	 */
	constructor(
		httpClient: HttpClient = defaultHttpClient(),
	) {
		this.URL = `${API_HOST}/tx`;
		this.httpClient = httpClient;
	}

	/**
	 * Broadcasts a transaction via WhatsOnChain.
	 *
	 * @param {Transaction} tx - The transaction to be broadcasted.
	 * @returns {Promise<BroadcastResponse | BroadcastFailure>} A promise that resolves to either a success or failure response.
	 */
	async broadcast(
		tx: Transaction,
	): Promise<BroadcastResponse | BroadcastFailure> {
		const rawtx = Utils.toBase64(tx.toBinary());

		const requestOptions = {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Accept: "application/json",
			},
			data: { rawtx },
		};

		try {
			const response = await this.httpClient.request<string>(
				this.URL,
				requestOptions,
			);
			if (response.ok) {
				const txid = response.data;
				return {
					status: "success",
					txid,
					message: "broadcast successful",
				};
			}
			return {
				status: "error",
				code: response.status.toString() ?? "ERR_UNKNOWN",
				description: response.data.message ?? "Unknown error",
			};
		} catch (error) {
			return {
				status: "error",
				code: "500",
				description: error instanceof Error
					? error.message
					: "Internal Server Error",
			};
		}
	}
}
