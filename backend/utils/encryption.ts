// Read more on this in backed/README.md under "Technical specs"/Encryption 
import crypto from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // "Initialisation Vector", ie 12 byte nonce
const AUTH_TAG_LENGTH = 16;
const CHUNK_SIZE = 23; 

export const generateKey = (): Buffer => crypto.randomBytes(32);

export function encrypt(text: string, key: Buffer): Buffer {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  const ciphertext = Buffer.concat([
    cipher.update(text, 'utf8'),
    cipher.final()
  ]);
  
  const authTag = cipher.getAuthTag();
  
  return Buffer.concat([iv, authTag, ciphertext]);
}

export function fragment(payload: Buffer): Buffer[] {
  const fragments: Buffer[] = [];
  for (let i = 0; i < payload.length; i += CHUNK_SIZE) {
    fragments.push(payload.subarray(i, i + CHUNK_SIZE));
  }
  return fragments;
}

export function decrypt(payload: Buffer, key: Buffer): string {
  const iv = payload.subarray(0, IV_LENGTH);
  const authTag = payload.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = payload.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final()
  ]);

  return decrypted.toString('utf8');
}

export const reassemble = (fragments: Buffer[]): Buffer => Buffer.concat(fragments);
