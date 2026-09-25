import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';

function getKey(): Buffer {
  const hexKey = process.env.ENCRYPTION_KEY;
  if (!hexKey || hexKey.length !== 64) {
    throw new Error('ENCRYPTION_KEY environment variable must be a 64-character hex string (32 bytes)');
  }
  return Buffer.from(hexKey, 'hex');
}

export interface EncryptedPayload {
  iv: string;
  tag: string;
  data: string;
}

/**
 * Encrypts plain text using AES-256-GCM
 */
export function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const key = getKey();
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  const payload: EncryptedPayload = {
    iv: iv.toString('hex'),
    tag: tag.toString('hex'),
    data: encrypted.toString('hex'),
  };

  return JSON.stringify(payload);
}

/**
 * Decrypts AES-256-GCM encrypted payload back to string
 */
export function decrypt(payloadStr: string): string {
  try {
    const payload: EncryptedPayload = JSON.parse(payloadStr);
    if (!payload.iv || !payload.tag || !payload.data) {
      throw new Error('Invalid encrypted payload structure');
    }

    const key = getKey();
    const iv = Buffer.from(payload.iv, 'hex');
    const tag = Buffer.from(payload.tag, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(payload.data, 'hex')),
      decipher.final(),
    ]);

    return decrypted.toString('utf8');
  } catch (err: unknown) {
    throw new Error(`Decryption failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
}

/**
 * Timing-safe token comparison utility to prevent timing attacks
 */
export function timingSafeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}
