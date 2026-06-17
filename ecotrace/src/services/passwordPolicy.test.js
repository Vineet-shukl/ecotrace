// src/services/passwordPolicy.test.js
import { describe, test, expect } from 'vitest';
import { validatePassword, PASSWORD_RULES } from './passwordPolicy';

describe('validatePassword()', () => {
  test('accepts a password meeting all rules', () => {
    const r = validatePassword('Str0ng!Pass');
    expect(r.valid).toBe(true);
    expect(r.failed).toEqual([]);
  });

  test('rejects an empty password and reports every rule', () => {
    const r = validatePassword('');
    expect(r.valid).toBe(false);
    expect(r.failed.length).toBe(PASSWORD_RULES.length);
  });

  test('fails when shorter than 8 characters', () => {
    expect(validatePassword('Aa1!aa').valid).toBe(false);
  });

  test('detects each missing class', () => {
    expect(validatePassword('lowercase1!').results.find(x => x.id === 'upper').passed).toBe(false);
    expect(validatePassword('UPPERCASE1!').results.find(x => x.id === 'lower').passed).toBe(false);
    expect(validatePassword('NoNumber!!').results.find(x => x.id === 'number').passed).toBe(false);
    expect(validatePassword('NoSpecial1').results.find(x => x.id === 'special').passed).toBe(false);
  });

  test('results array always has one entry per rule', () => {
    expect(validatePassword('whatever').results.length).toBe(PASSWORD_RULES.length);
  });
});
