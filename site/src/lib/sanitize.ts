import xss, { FilterXSS } from 'xss';

// Whitelist for markdown-generated HTML
const filter = new FilterXSS({
  whiteList: {
    h1: [], h2: [], h3: [], h4: [], h5: [], h6: [],
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
