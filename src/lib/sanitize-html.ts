import DOMPurify from 'dompurify';

const ALLOWED_TAGS = [
  'a', 'abbr', 'article', 'b', 'blockquote', 'br', 'caption', 'code', 'div', 'em', 'figcaption', 'figure',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hr', 'i', 'img', 'li', 'ol', 'p', 'pre', 'section', 'small', 'span',
  'strong', 'sub', 'sup', 'table', 'tbody', 'td', 'th', 'thead', 'tr', 'u', 'ul',
];

const ALLOWED_ATTR = ['href', 'src', 'alt', 'title', 'class', 'target', 'rel', 'width', 'height', 'colspan', 'rowspan', 'loading'];

let hooked = false;

/**
 * Sanitiza HTML guardado na BD (páginas do rodapé, etc.) antes de o injetar com
 * `dangerouslySetInnerHTML`. Só funciona no browser (DOMPurify precisa de DOM); no
 * servidor devolve string vazia — as páginas que o usam carregam o conteúdo no cliente.
 */
export function sanitizeHtml(dirty: string): string {
  if (typeof window === 'undefined' || !dirty) return '';

  if (!hooked) {
    hooked = true;
    DOMPurify.addHook('afterSanitizeAttributes', (node) => {
      if (node.tagName === 'A') {
        if (node.getAttribute('target') === '_blank') {
          node.setAttribute('rel', 'noopener noreferrer');
        } else {
          node.removeAttribute('target');
        }
      }
    });
  }

  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
    FORBID_TAGS: ['style', 'script', 'iframe', 'object', 'embed', 'form', 'input', 'svg', 'math'],
    FORBID_ATTR: ['style', 'onerror', 'onload'],
    KEEP_CONTENT: true,
  });
}
