/**
 * @qos/core — public API
 *
 * Single entry point for all shared protocol logic.
 * Imported by both `backend/` (Node.js) and `web/` (browser) — no platform-specific
 * code allowed here. All crypto uses globalThis.crypto (Web Crypto API).
 */

export {
  generateAesKey,
  exportAesKey,
  importAesKey,
  encrypt,
  decrypt,
  fragment,
  reassemble,
} from './encryption.js';

export {
  generateIdentityKeypair,
  exportPublicKey,
  importPublicKey,
  exportPrivateKey,
  importPrivateKey,
  wrapKey,
  unwrapKey,
  generateSigningKeypair,
  sign,
  verify,
} from './keys.js';

export type { IdentityKeypair, WrappedKey, SigningKeypair } from './keys.js';

export { buildManifest, verifyManifest } from './manifest.js';

export type { MessageManifest, ManifestInput } from './manifest.js';
