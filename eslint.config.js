const js = require('@eslint/js');
const tseslint = require('typescript-eslint');
const reactPlugin = require('eslint-plugin-react');
const reactHooksPlugin = require('eslint-plugin-react-hooks');
const reactNativePlugin = require('eslint-plugin-react-native');
const importPlugin = require('eslint-plugin-import');

module.exports = tseslint.config(
  // Global ignore
  {
    ignores: ['node_modules/', '.expo/', 'dist/', 'build/', '.tmp-tests/', '*.js', '*.config.*'],
  },

  // Base JS/TS recommended rules
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...tseslint.configs.stylistic,

  // React config
  {
    files: ['**/*.{jsx,tsx}'],
    plugins: { react: reactPlugin },
    settings: { react: { version: 'detect' } },
    rules: {
      ...reactPlugin.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off', // Not needed with new JSX transform
      'react/prop-types': 'off', // Use TypeScript for props
      'react/jsx-uses-react': 'off', // Not needed with new JSX transform
      'react/jsx-key': 'warn', // Warn on missing key in iterators
      'react/no-array-index-key': 'warn',
      'react/self-closing-comp': 'warn',
    },
  },

  // React Hooks config
  {
    files: ['**/*.{jsx,tsx}'],
    plugins: { 'react-hooks': reactHooksPlugin },
    rules: reactHooksPlugin.configs.recommended.rules,
  },

  // React Native config
  {
    files: ['**/*.{jsx,tsx}'],
    plugins: { 'react-native': reactNativePlugin },
    rules: {
      'react-native/no-unused-styles': 'warn',
      'react-native/no-color-literals': 'warn', // Encourage theme tokens
      'react-native/no-raw-text': 'off', // Many RN Text wrappers in screens
      'react-native/no-single-element-style-arrays': 'warn',
    },
  },

  // Import ordering
  {
    plugins: { import: importPlugin },
    settings: {
      'import/resolver': {
        typescript: { alwaysTryTypes: true },
      },
    },
    rules: {
      'import/order': [
        'warn',
        {
          groups: [
            'builtin', // fs, path
            'external', // npm packages
            'internal', // src/ aliases
            'parent', // ../foo
            'sibling', // ./bar
            'index', // .
          ],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
      'import/no-duplicates': 'warn',
      'import/no-unresolved': 'warn',
    },
  },

  // Project-specific overrides
  {
    rules: {
      // Temporarily allow 'any' — can tighten later
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-debugger': 'error',
      '@typescript-eslint/consistent-type-definitions': 'off',
    },
  },
);
