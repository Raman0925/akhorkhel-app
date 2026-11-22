const rnConfig = require('@react-native/eslint-config/flat');

module.exports = [
  {
    ignores: [
      'node_modules/**',
      '.claude/**',
      'android/**',
      'coverage/**',
      'e2e/**',
      '*.config.js',
      'jest.setup.ts',
      'jest.setup-after-env.ts',
      '**/*.generated.ts',
    ],
  },
  ...rnConfig,
  {
    // eslint-plugin-ft-flow (bundled by @react-native/eslint-config) crashes on ESLint 9; no Flow here.
    files: ['**/*.js'],
    rules: { 'ft-flow/define-flow-type': 'off', 'ft-flow/use-flow-type': 'off' },
  },
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      'no-console': ['error', { allow: ['warn', 'error'] }],
      'react-native/no-inline-styles': 'warn',
    },
  },
  {
    // Ads are only ever shown through src/monetization (section 3 of the handover).
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/monetization/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'react-native-google-mobile-ads',
              message: 'Import ads only through @/monetization (useAds, BannerSlot).',
            },
          ],
        },
      ],
    },
  },
  {
    // Features never import each other; they share code through app-level modules.
    files: ['src/features/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'react-native-google-mobile-ads',
              message: 'Import ads only through @/monetization (useAds, BannerSlot).',
            },
          ],
          patterns: [
            {
              group: ['@/app/**'],
              message: 'Features must not import from app/.',
            },
          ],
        },
      ],
    },
  },
];
