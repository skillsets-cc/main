import { FilterXSS } from 'xss';

// Whitelist for markdown-generated HTML
const filter = new FilterXSS({
  whiteList: {
    h1: ['id'], h2: ['id'], h3: ['id'], h4: ['id'], h5: ['id'], h6: ['id'],
    p: [], br: [], hr: [],
    ul: [], ol: [], li: [],
    a: ['href', 'title', 'target', 'rel'],
    img: ['src', 'alt', 'title'],
    code: ['class'], pre: ['class'],
    blockquote: [], em: [], strong: [], del: [],
    table: [], thead: [], tbody: [], tr: [], th: [], td: [],
    div: ['class'], span: ['class'],
  },
  stripIgnoreTag: true,
  stripIgnoreTagBody: ['script', 'style', 'noscript'],
});

export function sanitizeHtml(html: string): string {
  return filter.process(html);
}

/** Reject non-http(s) URLs (blocks javascript:, data:, vbscript:, etc.) */
export function sanitizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return url;
    }
    return '#';
  } catch {
    return '#';
  }
}
