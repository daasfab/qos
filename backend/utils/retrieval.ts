/**
 * backend/utils/retrieval.ts
 *
 * Fetches IPFS fragments via configurable public gateways with fallback,
 * per-request timeout, and retry logic.
 *
 * Gateway priority (env-configurable):
 *   1. IPFS_GATEWAY env var (if set) — custom / self-hosted gateway
 *   2. https://cloudflare-ipfs.com
 *   3. https://dweb.link
 *   4. http://127.0.0.1:8080  (local Kubo — dev fallback only)
 *
 * For each CID, gateways are tried in order until one succeeds.
 */

import axios, { type AxiosError } from 'axios';

// ---------------------------------------------------------------------------
// Gateway list
// ---------------------------------------------------------------------------

/** Returns the ordered list of gateway base URLs to try. */
function getGateways(): string[] {
  const envGateway = process.env['IPFS_GATEWAY'];
  const defaults = [
    'https://cloudflare-ipfs.com',
    'https://dweb.link',
    'http://127.0.0.1:8080', // local Kubo — last resort in dev
  ];

  return envGateway ? [envGateway, ...defaults] : defaults;
}

// ---------------------------------------------------------------------------
// Fragment fetching
// ---------------------------------------------------------------------------

const TIMEOUT_MS = 15_000; // 15 s per gateway attempt
const MAX_RETRIES = 2;      // retries per gateway before trying the next one

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetch a single IPFS fragment (by CID) from the first responsive gateway.
 * Tries each gateway in order; retries transient errors up to MAX_RETRIES times.
 *
 * Throws if all gateways are exhausted without a successful response.
 */
export async function fetchFragmentFromIPFS(cid: string): Promise<Uint8Array> {
  const gateways = getGateways();
  const errors: string[] = [];

  for (const gateway of gateways) {
    const url = `${gateway}/ipfs/${cid}`;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const response = await axios.get<ArrayBuffer>(url, {
          responseType: 'arraybuffer',
          timeout: TIMEOUT_MS,
        });

        return new Uint8Array(response.data);
      } catch (error) {
        const axiosErr = error as AxiosError;
        const status = axiosErr.response?.status;

        // 404 from this gateway → try the next one immediately (content not pinned here)
        if (status === 404) {
          errors.push(`${gateway}: 404 Not Found`);
          break; // skip remaining retries for this gateway
        }

        const msg = `${gateway} attempt ${attempt}/${MAX_RETRIES}: ${axiosErr.message}`;
        errors.push(msg);
        console.warn(`[retrieval] fetchFragment(${cid}) — ${msg}`);

        if (attempt < MAX_RETRIES) {
          await sleep(500 * attempt); // exponential back-off between retries
        }
      }
    }
  }

  throw new Error(
    `Failed to fetch CID ${cid} from all gateways:\n  ${errors.join('\n  ')}`,
  );
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Fetch all fragments for a message in parallel (independent gateway races),
 * reassemble them, and return the raw encrypted payload.
 *
 * Note: reassembly and decryption are handled by @qos/core so that the same
 * logic runs in both Node.js (backend) and the browser (web/).
 */
export async function fetchAllFragments(cids: string[]): Promise<Uint8Array[]> {
  return Promise.all(cids.map((cid) => fetchFragmentFromIPFS(cid)));
}
