import { jest } from '@jest/globals';
import { generateKey, encrypt, fragment } from '../../utils/encryption.js';
import { pinAllFragments } from '../../utils/ipfs.js';

describe('IPFS Pinning', () => {
  jest.setTimeout(15000); 

  it('Pin fragments to local IPFS cluster', async () => {
    const key = generateKey();
    // TODO: think of a better message, and add different langugaes like in encryption.test.ts
    const msg = "Confidential message example for integration testing blah blah.";
    
    const payload = encrypt(msg, key);
    const fragments = fragment(payload);
    const cids = await pinAllFragments(fragments);

    expect(cids).toBeDefined();
    expect(Array.isArray(cids)).toBe(true);
    expect(cids.length).toBe(fragments.length);
    
    cids.forEach(cid => {
      expect(typeof cid).toBe('string');
      expect(cid.length).toBeGreaterThan(40); 
    });
    
    console.log('Successfully pinned fragments. CIDs:', cids);
  });
});