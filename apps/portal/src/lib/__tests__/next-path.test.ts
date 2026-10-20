import { describe, expect, it } from 'vitest';
import { loginHref, safeNextPath } from '../next-path';

describe('safeNextPath', () => {
  it.each(['/tai-khoan/don-hang', '/x?y=1', '/', '/san-pham/gao-lut#danh-gia', '/tai-khoan/don-hang/HL12345678'])(
    'accepts same-origin path %s',
    (p) => {
      expect(safeNextPath(p)).toBe(p);
    },
  );

  it.each([
    '//evil.com',
    '///evil.com',
    'https://evil.com',
    'http:/evil.com',
    '/\\evil.com',
    '\\\\evil.com',
    '/a\\b',
    'javascript:alert(1)',
    'evil.com',
    '',
    ' /x',
    '/\t/evil.com',
    '/\n/evil.com',
    '/x\u0000',
  ])('rejects %j', (p) => {
    expect(safeNextPath(p)).toBe('/');
  });

  it.each([undefined, null, 42, {}, ['/x'], true])('rejects non-string %p', (p) => {
    expect(safeNextPath(p)).toBe('/');
  });

  it('does not bounce back to the login or register pages', () => {
    expect(safeNextPath('/dang-nhap')).toBe('/');
    expect(safeNextPath('/dang-ky?next=/x')).toBe('/');
  });

  it('rejects absurdly long values', () => {
    expect(safeNextPath(`/${'a'.repeat(3000)}`)).toBe('/');
  });
});

describe('loginHref', () => {
  it('encodes the return path', () => {
    expect(loginHref('/tai-khoan/don-hang/HL1?x=1')).toBe('/dang-nhap?next=%2Ftai-khoan%2Fdon-hang%2FHL1%3Fx%3D1');
  });
  it('drops an unsafe return path', () => {
    expect(loginHref('//evil.com')).toBe('/dang-nhap');
    expect(loginHref('/')).toBe('/dang-nhap');
  });
});
