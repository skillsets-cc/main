import DOMPurify from 'isomorphic-dompurify';

/**
 * Sanitizes HTML content to prevent XSS attacks.
 * Used for user-generated content like README files.
 */
export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html);
}
