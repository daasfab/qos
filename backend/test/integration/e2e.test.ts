/**
 * End-to-End Integration Test for Qos Messaging Workflow.
 * Tests the complete flow: Keypair Generation -> AES Encryption -> Fragmentation -> IPFS Pinning ->
 * Manifest Construction & Signing -> Signature Verification -> Key Unwrapping ->
 * Fragment Retrieval & Reassembly -> AES Decryption.
 */
import {
  generateIdentityKeypair,
  generateSigningKeypair,
  generateAesKey,
  encrypt,
  decrypt,
  fragment,
  reassemble,
  wrapKey,
  unwrapKey,
  buildManifest,
  verifyManifest,
  exportPublicKey,
  importPublicKey,
  importSigningPublicKey,
} from '@qos/core';

import { pinAllFragments } from '../../utils/ipfs.js';
import type { PinningStrategy } from '../../utils/ipfs.js';

class InMemoryPinningStrategy implements PinningStrategy {
  public store = new Map<string, Uint8Array>();

  async pin(data: Uint8Array, index: number): Promise<string> {
    const cid = `bafytest${index}_${Math.random().toString(36).substring(2, 10)}`;
    this.store.set(cid, new Uint8Array(data));
    return cid;
  }
}

describe('End-to-End Qos Messaging Protocol Flow', () => {
  test('Full message lifecycle across core protocol and backend services', async () => {
    // 1. Setup Identities
    const senderIdentity = await generateIdentityKeypair();
    const senderSigning = await generateSigningKeypair();
    const recipientIdentity = await generateIdentityKeypair();

    const senderId = 'usr_sender_12345';
    const recipientId = 'usr_recipient_67890';

    // Export/import public keys to simulate network transmission
    const recipientPubJwk = await exportPublicKey(recipientIdentity.publicKey);
    const recipientPubKey = await importPublicKey(recipientPubJwk);

    const senderSigningPubJwk = await exportPublicKey(senderSigning.publicKey);
    const senderSigningPubKey = await importSigningPublicKey(senderSigningPubJwk);

    // 2. Sender Encrypts Message
    const originalMessage = 'Qos Decentralized Private Message test string with special chars: 🚀🔒📱';
    const messageAesKey = await generateAesKey();

    const encryptedPayload = await encrypt(originalMessage, messageAesKey);

    // 3. Sender Fragments & Pins to IPFS
    const fragments = fragment(encryptedPayload);
    expect(fragments.length).toBeGreaterThan(0);

    const ipfsStorage = new InMemoryPinningStrategy();
    const cids = await pinAllFragments(fragments, ipfsStorage);
    expect(cids).toHaveLength(fragments.length);

    // 4. Sender Wraps AES key for Recipient & Builds Signed Manifest
    const wrappedKey = await wrapKey(messageAesKey, recipientPubKey);

    const manifest = await buildManifest(
      {
        sender_id: senderId,
        recipient_id: recipientId,
        cids,
        wrapped_key: wrappedKey,
      },
      senderSigning.privateKey,
    );

    expect(manifest.signature).toBeDefined();
    expect(manifest.cids).toEqual(cids);

    // --- TRANSMISSION / STORAGE BOUNDARY ---

    // 5. Recipient Verifies Manifest Signature
    const isManifestValid = await verifyManifest(manifest, senderSigningPubKey);
    expect(isManifestValid).toBe(true);

    // 6. Recipient Unwraps AES Key
    const unwrappedAesKey = await unwrapKey(manifest.wrapped_key, recipientIdentity.privateKey);

    // 7. Recipient Fetches Fragments & Reassembles
    const fetchedFragments: Uint8Array[] = manifest.cids.map((cid) => {
      const data = ipfsStorage.store.get(cid);
      if (!data) throw new Error(`CID ${cid} not found in IPFS storage`);
      return data;
    });

    const reassembledPayload = reassemble(fetchedFragments);
    expect(reassembledPayload).toEqual(encryptedPayload);

    // 8. Recipient Decrypts Message
    const decryptedMessage = await decrypt(reassembledPayload, unwrappedAesKey);
    expect(decryptedMessage).toBe(originalMessage);
  });
});
