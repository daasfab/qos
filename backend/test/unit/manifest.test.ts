/**
 * Unit tests for @qos/core manifest.ts
 * Tests buildManifest and verifyManifest.
 */
import {
  generateIdentityKeypair,
  generateSigningKeypair,
  generateAesKey,
  wrapKey,
  buildManifest,
  verifyManifest,
} from '@qos/core';

describe('Manifest creation & verification', () => {
  test('buildManifest + verifyManifest — valid manifest verifies cleanly', async () => {
    const senderSigning = await generateSigningKeypair();
    const recipientIdentity = await generateIdentityKeypair();
    const aesKey = await generateAesKey();

    const wrappedKey = await wrapKey(aesKey, recipientIdentity.publicKey);

    const manifest = await buildManifest(
      {
        sender_id: 'user-sender-uuid',
        recipient_id: 'user-recipient-uuid',
        cids: ['bafycid1', 'bafycid2', 'bafycid3'],
        wrapped_key: wrappedKey,
      },
      senderSigning.privateKey,
    );

    expect(manifest.id).toBeDefined();
    expect(manifest.sender_id).toBe('user-sender-uuid');
    expect(manifest.recipient_id).toBe('user-recipient-uuid');
    expect(manifest.cids).toHaveLength(3);
    expect(manifest.expires_at).toBe(manifest.timestamp + 7 * 24 * 60 * 60 * 1000);
    expect(manifest.signature).toBeDefined();

    const isValid = await verifyManifest(manifest, senderSigning.publicKey);
    expect(isValid).toBe(true);
  });

  test('verifyManifest — tampered CID array fails signature verification', async () => {
    const senderSigning = await generateSigningKeypair();
    const recipientIdentity = await generateIdentityKeypair();
    const aesKey = await generateAesKey();

    const wrappedKey = await wrapKey(aesKey, recipientIdentity.publicKey);

    const manifest = await buildManifest(
      {
        sender_id: 'user-sender-uuid',
        recipient_id: 'user-recipient-uuid',
        cids: ['bafycid1', 'bafycid2'],
        wrapped_key: wrappedKey,
      },
      senderSigning.privateKey,
    );

    // Tamper with CID order
    const tamperedManifest = {
      ...manifest,
      cids: ['bafycid2', 'bafycid1'],
    };

    const isValid = await verifyManifest(tamperedManifest, senderSigning.publicKey);
    expect(isValid).toBe(false);
  });

  test('verifyManifest — wrong public key fails verification', async () => {
    const senderSigning = await generateSigningKeypair();
    const attackerSigning = await generateSigningKeypair();
    const recipientIdentity = await generateIdentityKeypair();
    const aesKey = await generateAesKey();

    const wrappedKey = await wrapKey(aesKey, recipientIdentity.publicKey);

    const manifest = await buildManifest(
      {
        sender_id: 'user-sender-uuid',
        recipient_id: 'user-recipient-uuid',
        cids: ['bafycid1'],
        wrapped_key: wrappedKey,
      },
      senderSigning.privateKey,
    );

    const isValid = await verifyManifest(manifest, attackerSigning.publicKey);
    expect(isValid).toBe(false);
  });
});
