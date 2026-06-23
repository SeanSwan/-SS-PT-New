import { describe, expect, it } from 'vitest';
import { decodeJwtHeader, isUnsignedJwtToken } from './jwtTokenShape';

const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
const jwtWithAlg = (alg: string) => [encode({ alg, typ: 'JWT' }), encode({ sub: '101' }), 'signature'].join('.');

describe('jwtTokenShape', () => {
  it('detects unsigned JWT headers used by mock-auth smoke fixtures', () => {
    expect(isUnsignedJwtToken(jwtWithAlg('none'))).toBe(true);
    expect(isUnsignedJwtToken(jwtWithAlg('NONE'))).toBe(true);
  });

  it('does not reject signed or malformed token strings', () => {
    expect(isUnsignedJwtToken(jwtWithAlg('HS256'))).toBe(false);
    expect(isUnsignedJwtToken('test-token')).toBe(false);
    expect(isUnsignedJwtToken(null)).toBe(false);
  });

  it('decodes JWT headers without exposing payloads', () => {
    expect(decodeJwtHeader(jwtWithAlg('HS256'))).toMatchObject({ alg: 'HS256', typ: 'JWT' });
  });
});