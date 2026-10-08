
import {
  generateAesKey,
  encrypt,
  decrypt,
  fragment,
  reassemble,
} from '../../utils/encryption.js';

describe('Encryption (Web Crypto API)', () => {
  test.each([
    ['English', 'The quick brown fox jumps over the lazy dog. 1234567890. !@#$%^&*(). 😁🥥🚲'],
    ['Russian', 'Съешь же ещё этих мягких французских булок, да выпей чаю. 1234567890. !@#$%^&*(). 📼❤️🐻‍❄️'],
    ['Chinese', '你好，世界！这是一次测试。. 一二三四五六七八九十 . !@#$%^&*(). 🦋🥍🥭'],
    ['Spanish', 'El veloz murciélago hindú comía feliz cardillo y kiwi. 1234567890. !@#$%^&*(). ⚓️👻⏰'],
  ])('Encrypt → fragment → reassemble → decrypt [%s]', async (_lang, msg) => {
    const key = await generateAesKey();

    const payload = await encrypt(msg, key);
    const fragments = fragment(payload);
    const reassembled = reassemble(fragments);
    const decrypted = await decrypt(reassembled, key);

    expect(decrypted).toStrictEqual(msg);
  });

  test('Wrong key fails decryption', async () => {
    const key1 = await generateAesKey();
    const key2 = await generateAesKey();

    const payload = await encrypt('secret', key1);
    await expect(decrypt(payload, key2)).rejects.toThrow();
  });

  test('Tampered ciphertext fails authentication', async () => {
    const key = await generateAesKey();
    const payload = await encrypt('secret', key);

    // Flip a byte deep in the ciphertext (after the 12-byte IV)
    const tampered = new Uint8Array(payload);
    tampered[20] ^= 0xff;

    await expect(decrypt(tampered, key)).rejects.toThrow();
  });
});
