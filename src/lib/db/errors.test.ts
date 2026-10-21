import { describe, expect, it } from 'vitest';
import { isDbUnavailable, publicDbErrorMessage } from './errors';

describe('isDbUnavailable', () => {
  it('detects mecanidoc_app auth failures', () => {
    expect(isDbUnavailable(new Error('password authentication failed for user "mecanidoc_app"'))).toBe(true);
    expect(isDbUnavailable({ code: '28P01', message: 'auth' })).toBe(true);
    expect(isDbUnavailable(new Error('Invalid login credentials'))).toBe(false);
  });
});

describe('publicDbErrorMessage', () => {
  it('never includes the raw postgres wording', () => {
    expect(publicDbErrorMessage()).not.toMatch(/password authentication failed/i);
    expect(publicDbErrorMessage()).toMatch(/MECANIDOC_APP_DB_PASSWORD/);
  });
});
