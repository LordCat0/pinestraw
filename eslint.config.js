import { defineConfig } from 'eslint/config';
import js from '@eslint/js';
import prettier from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig(
  js.configs.recommended,
  tseslint.configs.recommended,
  prettier,
  {
    files: ['**/*.{js,ts}'],
    languageOptions: {
      globals: globals.node,
      ecmaVersion: 'latest',
      sourceType: 'module'
    },
    rules: {
      'no-var': 'error',
      'no-unused-vars': 'error',
      'no-undef': 'warn',
      'prefer-const': 'warn'
    }
  },
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      'no-undef': 'off',
      'no-unused-vars': 'off'
    }
  }
);
