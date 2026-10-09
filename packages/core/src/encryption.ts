/**
 * @qos/core — encryption.ts
 *
 * AES-256-GCM encrypt / decrypt using the Web Crypto API (SubtleCrypto).
 * Works identically in Node.js ≥ 20 (globalThis.crypto) and modern browsers.
 * All inputs/outputs are Uint8Array — no Node.js Buffer used.
 */

const ALGORITHM = 'AES-GCM';
const IV_LENGTH = 12;       // 96-bit nonce recommended for AES-GCM
const KEY_LENGTH = 256;     // bits

// ---------------------------------------------------------------------------
// Key generation
// ---------------------------------------------------------------------------

/** Generate a fresh random AES-256 key. */
export async function generateAesKey(): Promise<CryptoKey> {
  return globalThis.crypto.subtle.generateKey(
    { name: ALGORITHM, length: KEY_LENGTH },
    true,   // extractable — we need to export it to wrap with recipient pubkey
    ['encrypt', 'decrypt'],
  );
}

/** Export a CryptoKey to raw bytes (Uint8Array, 32 bytes). */
export async function exportAesKey(key: CryptoKey): Promise<Uint8Array> {
  const raw = await globalThis.crypto.subtle.exportKey('raw', key);
  return new Uint8Array(raw);
}

/** Import raw bytes (32-byte Uint8Array) back to a CryptoKey. */
export async function importAesKey(raw: Uint8Array): Promise<CryptoKey> {
  return globalThis.crypto.subtle.importKey(
    'raw',
    raw as BufferSource,
    { name: ALGORITHM },
    true,
    ['encrypt', 'decrypt'],
  );
}

// ---------------------------------------------------------------------------
// Encrypt / Decrypt
// ---------------------------------------------------------------------------

/**
 * Encrypt a UTF-8 string.
 * Output layout: [ iv (12 bytes) | ciphertext+authTag (variable) ]
 * Note: SubtleCrypto AES-GCM appends the 16-byte auth tag to the ciphertext
 * automatically — no need to handle it separately.
 */
export async function encrypt(plaintext: string, key: CryptoKey): Promise<Uint8Array> {
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encoded = new TextEncoder().encode(plaintext);

  const ciphertextWithTag = await globalThis.crypto.subtle.encrypt(
    { name: ALGORITHM, iv: iv as BufferSource },
    key,
    encoded as BufferSource,
  );

  // Concatenate iv + ciphertextWithTag
  const result = new Uint8Array(IV_LENGTH + ciphertextWithTag.byteLength);
  result.set(iv, 0);
  result.set(new Uint8Array(ciphertextWithTag), IV_LENGTH);
  return result;
}

/**
 * Decrypt a payload produced by `encrypt()`.
 * Expects layout: [ iv (12 bytes) | ciphertext+authTag ]
 */
export async function decrypt(payload: Uint8Array, key: CryptoKey): Promise<string> {
  if (payload.length < IV_LENGTH) {
    throw new Error(`Payload too short: expected at least ${IV_LENGTH} bytes, got ${payload.length}`);
  }

  const iv = payload.subarray(0, IV_LENGTH);
  const ciphertextWithTag = payload.subarray(IV_LENGTH);

  const plaintext = await globalThis.crypto.subtle.decrypt(
    { name: ALGORITHM, iv: iv as BufferSource },
    key,
    ciphertextWithTag as BufferSource,
  );

  return new TextDecoder().decode(plaintext);
}

// ---------------------------------------------------------------------------
// Fragmentation
// ---------------------------------------------------------------------------

// Chunk size chosen so each fragment is small enough to be individually
// addressable as a distinct IPFS block while keeping the fragment count sane
// for typical messages (<= 10 KB plaintext, ~15 fragments).
const CHUNK_SIZE = 512; // bytes

/** Split a Uint8Array payload into fixed-size fragments. */
export function fragment(payload: Uint8Array): Uint8Array[] {
  const fragments: Uint8Array[] = [];
  for (let i = 0; i < payload.length; i += CHUNK_SIZE) {
    fragments.push(payload.subarray(i, i + CHUNK_SIZE));
  }
  return fragments;
}

/** Reassemble ordered fragments back into a single Uint8Array. */
export function reassemble(fragments: Uint8Array[]): Uint8Array {
  const totalLength = fragments.reduce((acc, f) => acc + f.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const f of fragments) {
    result.set(f, offset);
    offset += f.length;
  }
  return result;
}
