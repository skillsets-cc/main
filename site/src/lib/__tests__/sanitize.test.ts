import { describe, it, expect } from 'vitest';
import { sanitizeHtml } from '../sanitize';

describe('sanitizeHtml', () => {
  describe('XSS protection', () => {
    it('strips inline script tags', () => {
      const malicious = '<p>Hello</p><script>alert("xss")</script>';
      const result = sanitizeHtml(malicious);
      expect(result).not.toContain('<script>');
      expect(result).not.toContain('alert');
      expect(result).toContain('<p>Hello</p>');
    });

    it('strips script tags with src', () => {
      const malicious = '<script src="https://evil.com/steal.js"></script><p>Content</p>';
      const result = sanitizeHtml(malicious);
      expect(result).not.toContain('<script');
      expect(result).not.toContain('evil.com');
      expect(result).toContain('<p>Content</p>');
    });

    it('strips onerror event handlers', () => {
      const malicious = '<img src="x" onerror="alert(document.cookie)">';
      const result = sanitizeHtml(malicious);
      expect(result).not.toContain('onerror');
      expect(result).not.toContain('alert');
    });

    it('strips onclick event handlers', () => {
      const malicious = '<a href="#" onclick="stealData()">Click me</a>';
      const result = sanitizeHtml(malicious);
      expect(result).not.toContain('onclick');
      expect(result).not.toContain('stealData');
      expect(result).toContain('Click me');
    });

    it('strips javascript: URLs in href', () => {
      const malicious = '<a href="javascript:alert(1)">Click</a>';
      const result = sanitizeHtml(malicious);
      expect(result).not.toContain('javascript:');
    });

    it('strips javascript: URLs in img src', () => {
      const malicious = '<img src="javascript:alert(1)">';
      const result = sanitizeHtml(malicious);
      expect(result).not.toContain('javascript:');
    });

    it('strips data: URLs with scripts', () => {
      const malicious = '<a href="data:text/html,<script>alert(1)</script>">Link</a>';
      const result = sanitizeHtml(malicious);
      expect(result).not.toContain('data:text/html');
    });

    it('strips SVG with embedded script', () => {
      const malicious = '<svg><script>alert(1)</script></svg>';
      const result = sanitizeHtml(malicious);
      expect(result).not.toContain('<script>');
    });

    it('strips iframe tags', () => {
      const malicious = '<iframe src="https://evil.com"></iframe><p>Text</p>';
      const result = sanitizeHtml(malicious);
      expect(result).not.toContain('<iframe');
      expect(result).not.toContain('evil.com');
      expect(result).toContain('<p>Text</p>');
    });

    it('strips object/embed tags', () => {
      const malicious = '<object data="malware.swf"></object><embed src="evil.swf">';
      const result = sanitizeHtml(malicious);
      expect(result).not.toContain('<object');
      expect(result).not.toContain('<embed');
    });

    it('strips style tags with expression', () => {
      const malicious = '<style>body { background: expression(alert(1)) }</style>';
      const result = sanitizeHtml(malicious);
      expect(result).not.toContain('expression');
    });
  });

  describe('preserves safe content', () => {
    it('preserves basic HTML elements', () => {
      const safe = '<h1>Title</h1><p>Paragraph with <strong>bold</strong> and <em>italic</em></p>';
      const result = sanitizeHtml(safe);
      expect(result).toBe(safe);
    });

    it('preserves links with safe URLs', () => {
      const safe = '<a href="https://example.com">Link</a>';
      const result = sanitizeHtml(safe);
      expect(result).toContain('href="https://example.com"');
    });

    it('preserves images with safe URLs', () => {
      const safe = '<img src="https://example.com/image.png" alt="Image">';
      const result = sanitizeHtml(safe);
      expect(result).toContain('src="https://example.com/image.png"');
    });

    it('preserves code blocks', () => {
      const safe = '<pre><code>const x = 1;</code></pre>';
      const result = sanitizeHtml(safe);
      expect(result).toContain('<pre>');
      expect(result).toContain('<code>');
      expect(result).toContain('const x = 1;');
    });

    it('preserves tables', () => {
      const safe = '<table><tr><td>Cell</td></tr></table>';
      const result = sanitizeHtml(safe);
      expect(result).toContain('<table>');
      expect(result).toContain('<tr>');
      expect(result).toContain('<td>');
    });

    it('preserves lists', () => {
      const safe = '<ul><li>Item 1</li><li>Item 2</li></ul>';
      const result = sanitizeHtml(safe);
      expect(result).toBe(safe);
    });
  });
});
