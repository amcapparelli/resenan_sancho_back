'use strict';

const js = require('@eslint/js');
const globals = require('globals');

// Flat config (ESLint 9). Mirrors the previous .eslintrc.json:
// eslint:recommended + 2-space indent, single quotes, semicolons, unix linebreaks.
module.exports = [
  {
    ignores: ['node_modules/', 'public/', 'coverage/'],
  },
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: {
        ...globals.node,
      },
    },
    rules: {
      indent: ['error', 2, { SwitchCase: 1 }],
      'linebreak-style': ['error', 'unix'],
      quotes: ['error', 'single'],
      semi: ['error', 'always'],
      // The codebase intentionally swallows some non-critical errors (e.g. a
      // Mailchimp sync failure must not break login).
      'no-empty': ['error', { allowEmptyCatch: true }],
      'no-unused-vars': ['error', { caughtErrors: 'none', argsIgnorePattern: '^_' }],
    },
  },
  {
    // Test files run under Jest's globals (describe/test/expect/jest).
    files: ['tests/**'],
    languageOptions: {
      globals: {
        ...globals.jest,
      },
    },
  },
];
