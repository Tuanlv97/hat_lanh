import sanitize from 'sanitize-html';

/** `/uploads/...` (no traversal, no protocol-relative) or an https URL. */
function isAllowedImageSrc(src: string): boolean {
  const s = src.trim();
  if (s.startsWith('/uploads/')) return !s.includes('..') && !s.includes('\\');
  return /^https:\/\/[^\s]+$/i.test(s);
}

const options: sanitize.IOptions = {
  allowedTags: [
    'h2', 'h3', 'h4', 'p', 'br', 'ul', 'ol', 'li', 'a', 'img',
    'strong', 'b', 'em', 'i', 'u', 'blockquote', 'hr', 'figure', 'figcaption',
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
  ],
  allowedAttributes: {
    a: ['href', 'rel', 'target'],
    img: ['src', 'alt', 'width', 'height'],
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  allowedSchemesAppliedToAttributes: ['href'],
  allowProtocolRelative: false,
  disallowedTagsMode: 'discard',
  // text inside these is dropped entirely (default already covers script/style/textarea/option)
  nonTextTags: ['script', 'style', 'textarea', 'option', 'iframe', 'noscript'],
  transformTags: {
    a: (tagName, attribs) => ({
      tagName,
      attribs: attribs.href ? { ...attribs, rel: 'noopener noreferrer', target: '_blank' } : attribs,
    }),
    img: (tagName, attribs) => {
      const { src, ...rest } = attribs;
      return { tagName, attribs: src !== undefined && isAllowedImageSrc(src) ? { ...rest, src } : rest };
    },
  },
  // an <img> without a valid src is useless: drop it
  exclusiveFilter: (frame) => frame.tag === 'img' && !frame.attribs.src,
};

/** Sanitizes rich-text HTML coming from the admin editor. Only the result may be stored. */
export function sanitizeHtml(html: string): string {
  return sanitize(html, options);
}
