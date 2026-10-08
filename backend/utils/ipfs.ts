/**
 * backend/utils/ipfs.ts
 *
 * Fragment pinning to IPFS via a pluggable PinningStrategy interface.
 * The only concrete strategy today is Pinata. A second provider (e.g.
 * web3.storage) can be added later by implementing PinningStrategy and
 * passing it to pinAllFragments() — no other code changes required.
 *
 * Configuration is fully environment-variable-driven (no hardcoded URLs).
 * Required env vars:
 *   PINATA_API_KEY      — your Pinata v2 API key
 *   PINATA_API_SECRET   — your Pinata v2 API secret
 */

import FormData from 'form-data';
import axios, { type AxiosError } from 'axios';


// PinningStrategy interface
export interface PinningStrategy {
  /**
   * Pin a single binary fragment to IPFS.
   * @param data    Raw fragment bytes
   * @param index   Fragment index (used for filename metadata)
   * @returns       The IPFS CID string for this fragment
   */
  pin(data: Uint8Array, index: number): Promise<string>;
}

// Pinata strategy

const PINATA_BASE_URL = 'https://api.pinata.cloud';
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 500;

function getPinataCredentials(): { apiKey: string; apiSecret: string } {
  const apiKey = process.env['PINATA_API_KEY'];
  const apiSecret = process.env['PINATA_API_SECRET'];

  if (!apiKey || !apiSecret) {
    throw new Error(
      'Missing Pinata credentials. Set PINATA_API_KEY and PINATA_API_SECRET env vars.',
    );
  }

  return { apiKey, apiSecret };
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class PinataStrategy implements PinningStrategy {
  async pin(data: Uint8Array, index: number): Promise<string> {
    const { apiKey, apiSecret } = getPinataCredentials();

    let lastError: unknown;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const form = new FormData();
        form.append('file', Buffer.from(data), {
          filename: `fragment-${index}.bin`,
          contentType: 'application/octet-stream',
        });

        const response = await axios.post<{ IpfsHash: string }>(
          `${PINATA_BASE_URL}/pinning/pinFileToIPFS`,
          form,
          {
            headers: {
              ...form.getHeaders(),
              pinata_api_key: apiKey,
              pinata_secret_api_key: apiSecret,
            },
            // 30s timeout — Pinata is usually fast but can queue during peak
            timeout: 30_000,
          },
        );

        return response.data.IpfsHash;
      } catch (error) {
        lastError = error;
        const axiosErr = error as AxiosError;
        const status = axiosErr.response?.status;

        // 4xx errors (except 429 rate-limit) are not retryable
        if (status !== undefined && status >= 400 && status < 500 && status !== 429) {
          console.error(
            `Pinata rejected fragment ${index} (HTTP ${status}). Not retrying.`,
          );
          throw error;
        }

        console.warn(
          `Pinata pin attempt ${attempt}/${MAX_RETRIES} failed for fragment ${index}:`,
          axiosErr.message,
        );

        if (attempt < MAX_RETRIES) {
          await sleep(RETRY_DELAY_MS * attempt); // exponential back-off
        }
      }
    }

    console.error(`Failed to pin fragment ${index} after ${MAX_RETRIES} attempts.`);
    throw lastError;
  }
}

// Public API

/** Default strategy — uses Pinata. Override by passing a different strategy. */
const defaultStrategy: PinningStrategy = new PinataStrategy();

/**
 * Pin a single fragment. Uses the provided strategy (defaults to Pinata).
 */
export async function pinFragment(
  data: Uint8Array,
  index: number,
  strategy: PinningStrategy = defaultStrategy,
): Promise<string> {
  return strategy.pin(data, index);
}

/**
 * Pin all fragments in order, collecting their CIDs.
 * Pins sequentially (not in parallel) to avoid overwhelming the pinning provider.
 */
export async function pinAllFragments(
  fragments: Uint8Array[],
  strategy: PinningStrategy = defaultStrategy,
): Promise<string[]> {
  const cids: string[] = [];

  for (let i = 0; i < fragments.length; i++) {
    const data = fragments[i];
    if (!data) throw new Error(`Fragment at index ${i} is undefined.`);
    const cid = await strategy.pin(data, i);
    cids.push(cid);
  }

  return cids;
}
