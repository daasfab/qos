/**
 * @qos/core — keys.ts
 *
 * ECDH P-256 identity keypair generation and AES key wrapping/unwrapping.
 * Uses the Web Crypto API (SubtleCrypto) — works in Node.js ≥ 20 and browsers.
 *
 * AES key wrapping uses ECDH-derived shared secret + AES-KW (RFC 3394).
 * This is the ECIES-style approach: for each message, an ephemeral ECDH keypair
 * is generated server-side/sender-side, combined with the recipient's public key
 * to derive a KEK (Key Encryption Key), which is then used to wrap the AES message key.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface IdentityKeypair {
  publicKey: CryptoKey;
  privateKey: CryptoKey;
}

/** The wrapped AES key bundle stored inside the manifest. */
export interface WrappedKey {
  /** Ephemeral sender public key (JWK), needed by recipient to re-derive the KEK. */
  ephemeralPublicKey: JsonWebKey;
  /** AES message key wrapped with the KEK (base64url). */
  wrappedKeyB64: string;
}

// ---------------------------------------------------------------------------
// Identity keypair
// ---------------------------------------------------------------------------

/** Generate a new ECDH P-256 identity keypair. */
export async function generateIdentityKeypair(): Promise<IdentityKeypair> {
  const { publicKey, privateKey } = await globalThis.crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveKey'],
  );
  return { publicKey, privateKey };
}

/** Export a public key to JWK format (safe to transmit / store server-side). */
export async function exportPublicKey(key: CryptoKey): Promise<JsonWebKey> {
  return globalThis.crypto.subtle.exportKey('jwk', key);
}

/** Import a public key from JWK format. */
export async function importPublicKey(jwk: JsonWebKey): Promise<CryptoKey> {
  return globalThis.crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    [],  // public keys have no usages in ECDH
  );
}

/** Export a private key to JWK (only stored locally — never transmitted). */
export async function exportPrivateKey(key: CryptoKey): Promise<JsonWebKey> {
  return globalThis.crypto.subtle.exportKey('jwk', key);
}

/** Import a private key from JWK (loaded from local storage on device). */
export async function importPrivateKey(jwk: JsonWebKey): Promise<CryptoKey> {
  return globalThis.crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveKey'],
  );
}

// ---------------------------------------------------------------------------
// AES Key Wrapping (ECDH + AES-KW)
// ---------------------------------------------------------------------------

/**
 * Derive a 256-bit Key Encryption Key (KEK) from an ECDH shared secret.
 * Uses HKDF with SHA-256.
 */
async function deriveKek(
  privateKey: CryptoKey,
  publicKey: CryptoKey,
): Promise<CryptoKey> {
  return globalThis.crypto.subtle.deriveKey(
    { name: 'ECDH', public: publicKey },
    privateKey,
    { name: 'AES-KW', length: 256 },
    false, // KEK is not extractable
    ['wrapKey', 'unwrapKey'],
  );
}

/**
 * Wrap (encrypt) an AES message key with the recipient's public key.
 *
 * Generates an ephemeral ECDH keypair, derives a shared-secret KEK, and
 * wraps the message key with AES-KW. Returns the wrapping bundle which is
 * embedded in the manifest.
 */
export async function wrapKey(
  aesKey: CryptoKey,
  recipientPublicKey: CryptoKey,
): Promise<WrappedKey> {
  // Generate ephemeral keypair for this specific message
  const ephemeral = await globalThis.crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveKey'],
  );

  const kek = await deriveKek(ephemeral.privateKey, recipientPublicKey);

  const wrappedKeyBuffer = await globalThis.crypto.subtle.wrapKey(
    'raw',
    aesKey,
    kek,
    { name: 'AES-KW' },
  );

  const ephemeralPublicKey = await exportPublicKey(ephemeral.publicKey);
  const wrappedKeyB64 = bufferToBase64(new Uint8Array(wrappedKeyBuffer));

  return { ephemeralPublicKey, wrappedKeyB64 };
}

/**
 * Unwrap (decrypt) an AES message key using the recipient's private key.
 *
 * Re-derives the KEK using the recipient's private key and the sender's
 * ephemeral public key stored in the WrappedKey bundle.
 */
export async function unwrapKey(
  wrappedKey: WrappedKey,
  recipientPrivateKey: CryptoKey,
): Promise<CryptoKey> {
  const ephemeralPublicKey = await importPublicKey(wrappedKey.ephemeralPublicKey);
  const kek = await deriveKek(recipientPrivateKey, ephemeralPublicKey);

  const wrappedKeyBytes = base64ToBuffer(wrappedKey.wrappedKeyB64);

  return globalThis.crypto.subtle.unwrapKey(
    'raw',
    wrappedKeyBytes,
    kek,
    { name: 'AES-KW' },
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt'],
  );
}

// ---------------------------------------------------------------------------
// Signing (ECDSA P-256, SHA-256) — used to sign manifests
// ---------------------------------------------------------------------------

export interface SigningKeypair {
  publicKey: CryptoKey;
  privateKey: CryptoKey;
}

/**
 * Generate an ECDSA P-256 signing keypair.
 * In practice, the same P-256 keypair can serve dual roles (ECDH + signing)
 * if desired, but the Web Crypto API requires separate key usages.
 * We keep them separate for clarity and forward flexibility.
 */
export async function generateSigningKeypair(): Promise<SigningKeypair> {
  const { publicKey, privateKey } = await globalThis.crypto.subtle.generateKey(
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['sign', 'verify'],
  );
  return { publicKey, privateKey };
}

/** Sign a canonical string with an ECDSA private key. Returns base64url signature. */
export async function sign(data: string, privateKey: CryptoKey): Promise<string> {
  const encoded = new TextEncoder().encode(data);
  const signature = await globalThis.crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    privateKey,
    encoded,
  );
  return bufferToBase64(new Uint8Array(signature));
}

/** Verify an ECDSA signature against a canonical string. */
export async function verify(
  data: string,
  signatureB64: string,
  publicKey: CryptoKey,
): Promise<boolean> {
  const encoded = new TextEncoder().encode(data);
  const signature = base64ToBuffer(signatureB64);
  return globalThis.crypto.subtle.verify(
    { name: 'ECDSA', hash: 'SHA-256' },
    publicKey,
    signature,
    encoded,
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function bufferToBase64(buffer: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < buffer.length; i++) {
    binary += String.fromCharCode(buffer[i]!);
  }
  return btoa(binary);
}

function base64ToBuffer(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
