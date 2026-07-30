import { generateKey, fragment, encrypt, decrypt, reassemble } from "../../utils/encryption.js";

describe('Encryption', () => {
    test.each([
        ['English', "The quick brown fox jumps over the lazy dog. 1234567890. !@#$%^&*(). 😁🥥🚲"],
        ['Russian', "Съешь же ещё этих мягких французских булок, да выпей чаю. 1234567890. !@#$%^&*(). 📼❤️🐻‍❄️"],
        ['Chinese', "你好，世界！这是一次测试。. 一二三四五六七八九十 . !@#$%^&*(). 🦋🥍🥭"],
        ['Spanish', "El veloz murciélago hindú comía feliz cardillo y kiwi; Jovencillo emponzoñado de whisky, ¡qué figurota exhibe!. 1234567890. !@#$%^&*(). ⚓️👻⏰"]
    ])('Encrypt/Decrypt %s message', (language, msg) => {
        const key = generateKey();

        const payload = encrypt(msg, key);
        const fragments = fragment(payload);

        const reassembledPayload = reassemble(fragments);
        const decryptedMessage = decrypt(reassembledPayload, key);

        expect(decryptedMessage).toStrictEqual(msg);
    });
    
});