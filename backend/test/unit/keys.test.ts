/**
 * Unit tests for @qos/core keys.ts
 * Tests ECDH keypair generation, AES key wrap/unwrap, and ECDSA signing.
 */
import {
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
} from '@qos/core';
import { generateAesKey, exportAesKey } from '@qos/core';

describe('Key generation', () => {
  test('generateIdentityKeypair — returns a valid CryptoKeyPair', async () => {
    const { publicKey, privateKey } = await generateIdentityKeypair();

    expect(publicKey.type).toBe('public');
    expect(privateKey.type).toBe('private');
    expect(publicKey.algorithm).toMatchObject({ name: 'ECDH', namedCurve: 'P-256' });
  });

  test('exportPublicKey — produces a valid JWK with kty=EC', async () => {
    const { publicKey } = await generateIdentityKeypair();
    const jwk = await exportPublicKey(publicKey);

    expect(jwk.kty).toBe('EC');
    expect(jwk.crv).toBe('P-256');
    expect(jwk.x).toBeDefined();
    expect(jwk.y).toBeDefined();
    // Private key component must NOT be present in a public key export
    expect(jwk.d).toBeUndefined();
  });

  test('importPublicKey → exportPublicKey — round-trip preserves key', async () => {
    const { publicKey } = await generateIdentityKeypair();
    const jwk1 = await exportPublicKey(publicKey);
    const reimported = await importPublicKey(jwk1);
    const jwk2 = await exportPublicKey(reimported);

    expect(jwk2.x).toBe(jwk1.x);
    expect(jwk2.y).toBe(jwk1.y);
  });

  test('exportPrivateKey → importPrivateKey — round-trip preserves key', async () => {
    const { privateKey } = await generateIdentityKeypair();
    const jwk1 = await exportPrivateKey(privateKey);
    const reimported = await importPrivateKey(jwk1);
    const jwk2 = await exportPrivateKey(reimported);

    expect(jwk2.d).toBe(jwk1.d);
  });
});

describe('AES key wrapping (ECDH + AES-KW)', () => {
  test('wrapKey + unwrapKey — round-trip recovers the original AES key bytes', async () => {
    const recipientKeypair = await generateIdentityKeypair();
    const aesKey = await generateAesKey();
    const originalBytes = await exportAesKey(aesKey);

    const wrappedKey = await wrapKey(aesKey, recipientKeypair.publicKey);
    const unwrapped  = await unwrapKey(wrappedKey, recipientKeypair.privateKey);
    const recoveredBytes = await exportAesKey(unwrapped);

    expect(recoveredBytes).toEqual(originalBytes);
  });

  test('wrapKey — produces distinct bundles for same key (ephemeral randomness)', async () => {
    const recipientKeypair = await generateIdentityKeypair();
    const aesKey = await generateAesKey();

    const wrap1 = await wrapKey(aesKey, recipientKeypair.publicKey);
    const wrap2 = await wrapKey(aesKey, recipientKeypair.publicKey);

    // Same AES key, but ephemeral ECDH keys differ each time
    expect(wrap1.wrappedKeyB64).not.toBe(wrap2.wrappedKeyB64);
    expect(wrap1.ephemeralPublicKey.x).not.toBe(wrap2.ephemeralPublicKey.x);
  });

  test('unwrapKey — fails with wrong recipient private key', async () => {
    const recipient1 = await generateIdentityKeypair();
    const recipient2 = await generateIdentityKeypair();

    const aesKey = await generateAesKey();
    const wrappedKey = await wrapKey(aesKey, recipient1.publicKey);

    // Attempting to unwrap with the wrong private key should throw
    await expect(unwrapKey(wrappedKey, recipient2.privateKey)).rejects.toThrow();
  });
});

describe('ECDSA signing (manifest signatures)', () => {
  test('sign + verify — valid signature verifies correctly', async () => {
    const { publicKey, privateKey } = await generateSigningKeypair();
    const data = 'sender123recipient456789012345678cid1,cid2,cid3wrappedkeydata';

    const signature = await sign(data, privateKey);
    const valid = await verify(data, signature, publicKey);

    expect(valid).toBe(true);
  });

  test('verify — tampered data fails verification', async () => {
    const { publicKey, privateKey } = await generateSigningKeypair();
    const data = 'sender123recipient456789012345678cid1,cid2wrappedkeydata';

    const signature = await sign(data, privateKey);
    const tampered  = data + 'EXTRA';
    const valid     = await verify(tampered, signature, publicKey);

    expect(valid).toBe(false);
  });

  test('verify — signature from different key fails', async () => {
    const keypair1 = await generateSigningKeypair();
    const keypair2 = await generateSigningKeypair();
    const data = 'some canonical manifest string';

    const signature = await sign(data, keypair1.privateKey);
    const valid     = await verify(data, signature, keypair2.publicKey);

    expect(valid).toBe(false);
  });
});
