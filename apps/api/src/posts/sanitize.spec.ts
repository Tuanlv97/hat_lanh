import { sanitizeHtml } from './sanitize';

describe('sanitizeHtml', () => {
  it('drops script and event handlers; unsafe img src is removed', () => {
    const out = sanitizeHtml('<p>hi</p><script>alert(1)</script><img src=x onerror=alert(1)>');
    expect(out).toContain('<p>hi</p>');
    expect(out).not.toMatch(/script|onerror|alert/i);
    expect(out).not.toContain('src=');
  });
  it('removes javascript: and data: hrefs', () => {
    expect(sanitizeHtml('<a href="javascript:alert(1)">x</a>')).not.toMatch(/href|javascript/i);
    expect(sanitizeHtml('<a href="data:text/html,x">x</a>')).not.toMatch(/href|data:/i);
  });
  it('keeps http(s)/mailto links and adds rel + target', () => {
    const out = sanitizeHtml('<a href="https://a.com">x</a><a href="mailto:a@b.c">m</a>');
    expect(out).toContain('href="https://a.com"');
    expect(out).toContain('rel="noopener noreferrer"');
    expect(out).toContain('target="_blank"');
    expect(out).toContain('href="mailto:a@b.c"');
  });
  it('keeps /uploads and https images, drops http, data and protocol-relative images', () => {
    expect(sanitizeHtml('<img src="/uploads/a.png" alt="a" width="10">')).toContain('src="/uploads/a.png"');
    expect(sanitizeHtml('<img src="https://x.com/a.png">')).toContain('src="https://x.com/a.png"');
    expect(sanitizeHtml('<img src="http://x.com/a.png">')).not.toContain('src=');
    expect(sanitizeHtml('<img src="data:image/png;base64,AAA">')).not.toContain('src=');
    expect(sanitizeHtml('<img src="//evil.com/a.png">')).not.toContain('src=');
    expect(sanitizeHtml('<img src="/uploads/../secret.png">')).not.toContain('src=');
  });
  it('removes iframe/style and keeps allowed formatting', () => {
    expect(sanitizeHtml('<iframe src="https://a.com"></iframe><style>p{}</style>ok')).toBe('ok');
    const html =
      '<h2>T</h2><ul><li><strong>a</strong></li></ul><blockquote>q</blockquote><table><tbody><tr><td>1</td></tr></tbody></table><hr>';
    expect(sanitizeHtml(html)).toContain('<h2>T</h2>');
    expect(sanitizeHtml(html)).toContain('<table>');
  });
  it('strips h1 tags and class/style attributes', () => {
    const out = sanitizeHtml('<h1 class="a" style="x">T</h1>');
    expect(out).not.toMatch(/<h1|class|style/);
  });
});
