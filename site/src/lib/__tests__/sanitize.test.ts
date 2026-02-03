import { describe, it, expect } from 'vitest';
import { sanitizeHtml } from '../sanitize';

describe('sanitizeHtml', () => {
  describe('allowed elements', () => {
    it('preserves standard markdown elements', () => {
      const input = '<h1>Title</h1><p>Text with <strong>bold</strong> and <em>italic</em></p>';
      expect(sanitizeHtml(input)).toBe(input);
    });

    it('preserves lists', () => {
      const input = '<ul><li>One</li><li>Two</li></ul><ol><li>First</li></ol>';
      expect(sanitizeHtml(input)).toBe(input);
    });

    it('preserves code blocks', () => {
      const input = '<pre class="language-js"><code class="language-js">const x = 1;</code></pre>';
      expect(sanitizeHtml(input)).toBe(input);
    });

    it('preserves tables', () => {
      const input = '<table><thead><tr><th>A</th></tr></thead><tbody><tr><td>1</td></tr></tbody></table>';
      expect(sanitizeHtml(input)).toBe(input);
    });

    it('preserves links with safe attributes', () => {
      const input = '<a href="https://example.com" title="Example" target="_blank" rel="noopener">Link</a>';
      expect(sanitizeHtml(input)).toBe(input);
    });

    it('preserves images with safe attributes', () => {
      const input = '<img src="https://example.com/img.png" alt="Alt text" title="Title">';
      expect(sanitizeHtml(input)).toBe(input);
    });

    it('preserves blockquotes', () => {
      const input = '<blockquote>Quote</blockquote>';
      expect(sanitizeHtml(input)).toBe(input);
    });

    it('preserves hr and br', () => {
      const input = '<p>Line<br>break</p><hr>';
      expect(sanitizeHtml(input)).toBe(input);
    });

    it('preserves del (strikethrough)', () => {
      const input = '<p>This is <del>deleted</del> text</p>';
      expect(sanitizeHtml(input)).toBe(input);
    });

    it('preserves div and span with class attributes', () => {
      const input = '<div class="container"><span class="highlight">Text</span></div>';
      expect(sanitizeHtml(input)).toBe(input);
    });
  });

  describe('XSS prevention', () => {
    it('strips script tags and their content', () => {
      const input = '<p>Hello</p><script>alert("xss")</script><p>World</p>';
      expect(sanitizeHtml(input)).toBe('<p>Hello</p><p>World</p>');
    });

    it('strips inline event handlers', () => {
      const input = '<p onclick="alert(1)">Click me</p>';
      expect(sanitizeHtml(input)).toBe('<p>Click me</p>');
    });

    it('strips javascript: URLs in href', () => {
      const input = '<a href="javascript:alert(1)">Click</a>';
      const result = sanitizeHtml(input);
      expect(result).not.toContain('javascript:');
    });

    it('strips style tags and their content', () => {
      const input = '<style>body { background: red; }</style><p>Text</p>';
      expect(sanitizeHtml(input)).toBe('<p>Text</p>');
    });

    it('strips noscript tags and their content', () => {
      const input = '<noscript><img src="x" onerror="alert(1)"></noscript><p>Text</p>';
      expect(sanitizeHtml(input)).toBe('<p>Text</p>');
    });

    it('strips iframe tags', () => {
      const input = '<iframe src="https://evil.com"></iframe><p>Text</p>';
      expect(sanitizeHtml(input)).toBe('<p>Text</p>');
    });

    it('strips object and embed tags', () => {
      const input = '<object data="x"><embed src="y"></object><p>Text</p>';
      expect(sanitizeHtml(input)).toBe('<p>Text</p>');
    });

    it('strips form elements but preserves text content', () => {
      const input = '<form action="https://evil.com"><input type="password"><button>Submit</button></form><p>Text</p>';
      const result = sanitizeHtml(input);
      expect(result).not.toContain('<form');
      expect(result).not.toContain('<input');
      expect(result).not.toContain('<button');
      expect(result).toContain('<p>Text</p>');
    });

    it('strips data: URLs in img src', () => {
      const input = '<img src="data:text/html,<script>alert(1)</script>">';
      const result = sanitizeHtml(input);
      expect(result).not.toContain('data:');
    });

    it('strips SVG with embedded scripts', () => {
      const input = '<svg onload="alert(1)"><script>alert(2)</script></svg><p>Text</p>';
      expect(sanitizeHtml(input)).toBe('<p>Text</p>');
    });

    it('handles nested malicious content', () => {
      const input = '<div><p><a href="javascript:alert(1)" onclick="alert(2)">Click<script>alert(3)</script></a></p></div>';
      const result = sanitizeHtml(input);
      expect(result).not.toContain('javascript:');
      expect(result).not.toContain('onclick');
      expect(result).not.toContain('<script>');
    });

    it('handles malformed HTML attempts', () => {
      const input = '<p>Text</p<script>alert(1)</script>>';
      const result = sanitizeHtml(input);
      expect(result).not.toContain('alert');
    });
  });

  describe('edge cases', () => {
    it('handles empty string', () => {
      expect(sanitizeHtml('')).toBe('');
    });

    it('handles plain text', () => {
      expect(sanitizeHtml('Hello world')).toBe('Hello world');
    });

    it('preserves HTML entities', () => {
      expect(sanitizeHtml('<p>&lt;script&gt;</p>')).toBe('<p>&lt;script&gt;</p>');
    });
  });
});
