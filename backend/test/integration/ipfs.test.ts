/**
 * IPFS pinning tests — uses a mock PinningStrategy so no live cluster is needed.
 * The mock asserts that the strategy receives correctly shaped Uint8Array fragments
 * and returns well-formed CID strings.
 */
import { generateAesKey, encrypt, fragment } from '../../utils/encryption.js';
import { pinAllFragments, pinFragment } from '../../utils/ipfs.js';
import type { PinningStrategy } from '../../utils/ipfs.js';

// Mock strategy
// (Fake CID generator — produces deterministic, plausible-looking CID strings)
function fakeCid(index: number): string {
  // Real CIDv1 are base32, ~59 chars. We simulate that shape.
  return `bafybeif${index.toString().padStart(4, '0')}${'a'.repeat(50)}`;
}

class MockPinningStrategy implements PinningStrategy {
  public calls: Array<{ data: Uint8Array; index: number }> = [];

  async pin(data: Uint8Array, index: number): Promise<string> {
    this.calls.push({ data: new Uint8Array(data), index });
    return fakeCid(index);
  }
}

// Tests:
describe('IPFS Pinning (mock strategy)', () => {
  test('pinFragment — passes correct data and index to strategy', async () => {
    const mock = new MockPinningStrategy();
    const data = new Uint8Array([1, 2, 3, 4, 5]);

    const cid = await pinFragment(data, 7, mock);

    expect(mock.calls).toHaveLength(1);
    expect(mock.calls[0]!.index).toBe(7);
    expect(mock.calls[0]!.data).toEqual(data);
    expect(cid).toBe(fakeCid(7));
  });

  test('pinAllFragments — returns one CID per fragment in correct order', async () => {
    const mock = new MockPinningStrategy();
    const key = await generateAesKey();

    const messages = [
      'Confidential message example for integration testing — English.',
      'Конфиденциальное тестовое сообщение — Russian.',
    ];

    for (const msg of messages) {
      mock.calls = []; // reset between runs

      const payload = await encrypt(msg, key);
      const fragments = fragment(payload);
      const cids = await pinAllFragments(fragments, mock);

      expect(cids).toHaveLength(fragments.length);
      expect(mock.calls).toHaveLength(fragments.length);

      // Verify each call received the right fragment bytes and sequential index
      mock.calls.forEach((call, i) => {
        expect(call.index).toBe(i);
        expect(call.data).toEqual(fragments[i]);
      });

      // Verify CIDs are non-empty strings (real CIDs from Pinata are ~59 chars)
      cids.forEach((cid) => {
        expect(typeof cid).toBe('string');
        expect(cid.length).toBeGreaterThan(40);
      });
    }
  });

  test('pinAllFragments — throws if a fragment is undefined', async () => {
    const mock = new MockPinningStrategy();
    // @ts-expect-error — intentionally passing undefined to test error path
    await expect(pinAllFragments([undefined], mock)).rejects.toThrow();
  });
});
