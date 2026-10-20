import { describe, expect, it } from 'vitest';
import { blogHref, COMMENT_MAX, parsePage, totalPages, validateComment, withUploadOrigin } from '../blog';

describe('blogHref', () => {
  it('omits defaults', () => {
    expect(blogHref('')).toBe('/blog');
    expect(blogHref('', 1)).toBe('/blog');
  });
  it('keeps topic and page', () => {
    expect(blogHref('thuc-duong')).toBe('/blog?topic=thuc-duong');
    expect(blogHref('thuc-duong', 3)).toBe('/blog?topic=thuc-duong&page=3');
    expect(blogHref('', 2)).toBe('/blog?page=2');
  });
});

describe('parsePage', () => {
  it('falls back to 1', () => {
    for (const v of ['', 'abc', '0', '-2', '99999999']) expect(parsePage(v)).toBe(1);
  });
  it('accepts positive integers', () => expect(parsePage('4')).toBe(4));
});

describe('totalPages', () => {
  it('rounds up and is at least 1', () => {
    expect(totalPages(0, 9)).toBe(1);
    expect(totalPages(9, 9)).toBe(1);
    expect(totalPages(10, 9)).toBe(2);
  });
});

describe('validateComment', () => {
  it('rejects empty and whitespace', () => {
    expect(validateComment('   ')).toBe('Vui lòng nhập nội dung');
  });
  it('rejects too long', () => {
    expect(validateComment('a'.repeat(COMMENT_MAX + 1))).toMatch(/tối đa/);
  });
  it('accepts normal text', () => expect(validateComment(' Bài hay quá ')).toBeNull());
});

describe('withUploadOrigin', () => {
  it('points upload images at the API host and leaves others', () => {
    const out = withUploadOrigin('<img src="/uploads/a.png"><img src="https://x/y.png">', 'http://api/uploads/');
    expect(out).toBe('<img src="http://api/uploads/a.png"><img src="https://x/y.png">');
  });
});
