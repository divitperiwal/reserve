import { describe, expect, it } from 'vitest';
import { keyBytes } from './push';

describe('keyBytes', () => {
  it('decodes unpadded base64url into raw bytes', () => {
    expect(Array.from(keyBytes('-_8'))).toEqual([0xfb, 0xff]);
    expect(Array.from(keyBytes('AQID'))).toEqual([1, 2, 3]);
  });

  it('decodes a 65 byte VAPID public key', () => {
    const key = 'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM';
    const bytes = keyBytes(key);
    expect(bytes.length).toBe(65);
    expect(bytes[0]).toBe(4);
  });
});
