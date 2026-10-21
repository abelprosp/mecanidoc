import { describe, expect, it } from 'vitest';
import { isValidEmail, normalizeEmail, passwordProblem, safeRedirectPath } from './validation';
import { publicAuthError } from './public-error';

describe('email', () => {
  it('normalizes and validates', () => {
    expect(normalizeEmail('  Admin@MecaniDoc.COM ')).toBe('admin@mecanidoc.com');
    expect(isValidEmail('admin@mecanidoc.com')).toBe(true);
    expect(isValidEmail('pas-un-email')).toBe(false);
  });
});

describe('passwordProblem', () => {
  it('requires length, letter and digit', () => {
    expect(passwordProblem('short')).toMatch(/au moins 8/);
    expect(passwordProblem('onlyletters')).toMatch(/lettre et un chiffre/);
    expect(passwordProblem('Admin1234')).toBeNull();
  });

  it('rejects password equal to email', () => {
    expect(passwordProblem('SamePass1', 'SamePass1')).toMatch(/identique/);
  });
});

describe('safeRedirectPath', () => {
  it('blocks open redirects', () => {
    expect(safeRedirectPath('https://evil.test')).toBe('/');
    expect(safeRedirectPath('//evil.test')).toBe('/');
    expect(safeRedirectPath('\\evil')).toBe('/');
    expect(safeRedirectPath('/dashboard/admin')).toBe('/dashboard/admin');
  });
});

describe('publicAuthError', () => {
  it('hides postgres failures from the buyer', () => {
    expect(publicAuthError('password authentication failed for user "mecanidoc_app"')).toMatch(
      /MECANIDOC_APP_DB_PASSWORD/
    );
    expect(publicAuthError('Email ou mot de passe incorrect.')).toBe('Email ou mot de passe incorrect.');
  });
});
