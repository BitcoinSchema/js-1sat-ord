/** fetch function interface limited to options needed by ts-sdk */
import type { HttpClient, HttpClientRequestOptions, HttpClientResponse } from "@bsv/sdk";
/**
   * Makes a request to the server.
   * @param url The URL to make the request to.
   * @param options The request configuration.
   */
export type Fetch = (url: string, options: FetchOptions) => Promise<Response>;
/**
 * An interface for configuration of the request to be passed to the fetch method
 * limited to options needed by ts-sdk.
 */
export interface FetchOptions {
    /** A string to set request's method. */
    method?: string;
    /** An object literal set request's headers. */
    headers?: Record<string, string>;
    /** An object or null to set request's body. */
    body?: string | null;
}
/**
 * Adapter for Node.js Https module to be used as HttpClient
 */
export declare class FetchHttpClient implements HttpClient {
    private readonly fetch;
    constructor(fetch: Fetch);
    request<D>(url: string, options: HttpClientRequestOptions): Promise<HttpClientResponse<D>>;
}
