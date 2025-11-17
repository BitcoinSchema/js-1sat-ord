import { type HttpClient, type HttpClientResponse, NodejsHttpClient } from "@bsv/sdk"
import { FetchHttpClient } from "./fetch"

export function defaultHttpClient (): HttpClient {
  const noHttpClient: HttpClient = {
    async request (..._): Promise<HttpClientResponse> {
      throw new Error('No method available to perform HTTP request')
    }
  }

  if (typeof window !== 'undefined' && typeof window.fetch === 'function') {
    // Use fetch in a browser environment
    return new FetchHttpClient(window.fetch.bind(window))
  }
  if (typeof require !== 'undefined') {
    // Use Node.js https module
    try {
      const https = require('node:https')
      return new NodejsHttpClient(https)
    } catch (e) {
      return noHttpClient
    }
  } else {
    return noHttpClient
  }
}
