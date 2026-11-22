module.exports = {
  preset: '@react-native/jest-preset',
  setupFiles: ['<rootDir>/jest.setup.ts'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup-after-env.ts'],
  testTimeout: 30000,
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\.(m4a|aac|mp3|wav|png|webp|jpg|ttf)$': '<rootDir>/jest/mocks/fileMock.js',
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|@react-navigation|react-native-.*|@shopify/react-native-skia|nitro-core)/)',
  ],
  testPathIgnorePatterns: ['/node_modules/', '/.claude/', '/android/', '/e2e/'],
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/*.d.ts', '!src/**/*.generated.ts'],
  coverageThreshold: {
    './src/features/tracing/scorer/': { lines: 90, branches: 85, functions: 90, statements: 90 },
  },
};
