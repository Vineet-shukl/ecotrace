// src/services/passwordPolicy.js
// Single source of truth for the password strength policy. Pure + reusable.

/** Ordered list of rules; each has a label and a test against the candidate. */
export const PASSWORD_RULES = [
  { id: 'length',  label: 'At least 8 characters',      test: (p) => p.length >= 8 },
  { id: 'upper',   label: 'An uppercase letter (A–Z)',  test: (p) => /[A-Z]/.test(p) },
  { id: 'lower',   label: 'A lowercase letter (a–z)',   test: (p) => /[a-z]/.test(p) },
  { id: 'number',  label: 'A number (0–9)',             test: (p) => /[0-9]/.test(p) },
  { id: 'special', label: 'A special character (!@#…)', test: (p) => /[^A-Za-z0-9]/.test(p) },
];

/**
 * Evaluate a password against the policy.
 * @param {string} password
 * @returns {{ valid: boolean, results: Array<{id,label,passed}>, failed: string[] }}
 */
export function validatePassword(password = '') {
  const results = PASSWORD_RULES.map(r => ({
    id: r.id,
    label: r.label,
    passed: r.test(password),
  }));
  const failed = results.filter(r => !r.passed).map(r => r.label);
  return { valid: failed.length === 0, results, failed };
}
