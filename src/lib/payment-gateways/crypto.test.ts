import { describe, expect, it } from 'vitest';
import { verifyHmac, phonePeChecksum, verifyPhonePeChecksum } from './crypto';

describe('verifyHmac', () => {
  it('accepts a valid HMAC-SHA256 signature', () => {
    const body = '{"event":"payment.captured"}';
    const secret = 'test-secret';
    const { createHmac } = require('node:crypto') as typeof import('node:crypto');
    const signature = createHmac('sha256', secret).update(body).digest('hex');
    expect(verifyHmac('sha256', body, secret, signature)).toBe(true);
  });

  it('rejects a wrong signature', () => {
    expect(verifyHmac('sha256', '{"event":"a"}', 'secret', 'deadbeef')).toBe(false);
  });

  it('rejects empty signature or secret', () => {
    expect(verifyHmac('sha256', 'body', '', 'abc')).toBe(false);
    expect(verifyHmac('sha256', 'body', 'secret', '')).toBe(false);
  });
});

describe('phonePeChecksum', () => {
  it('produces the documented checksum format with ### salt index', () => {
    const { createHmac } = require('node:crypto') as typeof import('node:crypto');
    const body = '{"merchantId":"M1","amount":100}';
    const saltKey = 'sk';
    const saltIndex = '1';
    const sha256 = createHmac('sha256', saltKey).update(`${body}/pg/v1/pay`).digest('hex');
    const expected = `${Buffer.from(sha256).toString('base64')}###1`;
    expect(phonePeChecksum(body, saltKey, saltIndex)).toBe(expected);
  });

  it('verifies a valid checksum', () => {
    const body = '{"merchantId":"M1","amount":100}';
    const checksum = phonePeChecksum(body, 'sk', '1');
    expect(verifyPhonePeChecksum(body, checksum, 'sk', '1', '/pg/v1/pay')).toBe(true);
  });

  it('rejects a tampered checksum', () => {
    const body = '{"merchantId":"M1","amount":100}';
    expect(verifyPhonePeChecksum(body, 'tampered###1', 'sk', '1', '/pg/v1/pay')).toBe(false);
  });
});
