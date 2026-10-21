import { describe, expect, it } from 'vitest';
import { DbValidationError, assertIdent, quoteIdent } from './sql-ident';

describe('assertIdent', () => {
  it('accepts simple identifiers', () => {
    expect(assertIdent('order_items')).toBe('order_items');
    expect(quoteIdent('products')).toBe('"products"');
  });

  it('rejects injection payloads', () => {
    expect(() => assertIdent('products; drop table users')).toThrow(DbValidationError);
    expect(() => assertIdent('id) OR 1=1 --')).toThrow(DbValidationError);
    expect(() => assertIdent('*')).toThrow(DbValidationError);
    expect(() => assertIdent('1id')).toThrow(DbValidationError);
  });
});
