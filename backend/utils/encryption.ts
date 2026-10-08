/**
 * backend/utils/encryption.ts
 *
 * Thin re-export shim. All crypto logic now lives in @qos/core so it can be
 * shared with the web frontend without code duplication.
 *
 * The original Node.js-only implementation (using `node:crypto` + Buffer) has
 * been replaced with Web Crypto API equivalents in packages/core/src/encryption.ts.
 *
 * IMPORTANT — API change from the original draft:
 *   - generateKey() → generateAesKey()  (returns Promise<CryptoKey>)
 *   - encrypt() / decrypt()             (now async, use CryptoKey, Uint8Array)
 *   - fragment() / reassemble()         (same semantics, Uint8Array instead of Buffer)
 *
 * See packages/core/src/encryption.ts for full documentation.
 */

export {
  generateAesKey,
  exportAesKey,
  importAesKey,
  encrypt,
  decrypt,
  fragment,
  reassemble,
} from '@qos/core';
