import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Shared HMAC helpers used by gateway signature verification.
 */
export function verifyHmac(algorithm: 'sha256' | 'sha1', rawBody: string, secret: string, received: string): boolean {
  if (!secret || !received) return false;
  const expected = createHmac(algorithm, secret).update(rawBody).digest('hex');
  const expectedBuffer = Buffer.from(expected, 'hex');
  const receivedBuffer = Buffer.from(received, 'hex');
  return expectedBuffer.length === receivedBuffer.length && timingSafeEqual(expectedBuffer, receivedBuffer);
}

/**
 * PhonePe X-VERIFY checksum: base64(SHA256(requestBody + saltKey + "/pg/v1/pay" + saltIndex) + "###" + saltIndex)
 */
export function phonePeChecksum(rawBody: string, saltKey: string, saltIndex: string, endpoint = '/pg/v1/pay'): string {
  const sha256 = createHmac('sha256', saltKey).update(`${rawBody}${endpoint}`).digest('hex');
  return `${Buffer.from(sha256).toString('base64')}###${saltIndex}`;
}

export function verifyPhonePeChecksum(rawBody: string, received: string, saltKey: string, saltIndex: string, endpoint: string): boolean {
  const expected = phonePeChecksum(rawBody, saltKey, saltIndex, endpoint);
  return safeEqual(expected, received);
}

function safeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  return aBuf.length === bBuf.length && timingSafeEqual(aBuf, bBuf);
}
