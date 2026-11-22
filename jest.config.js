module.exports = {
  preset: '@react-native/jest-preset',
  // Only crawl project sources (agent worktrees under .claude/ hold full copies + node_modules).
  roots: ['<rootDir>/src', '<rootDir>/tools', '<rootDir>/jest'],
  setupFiles: ['<rootDir>/jest.setup.ts'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup-after-env.ts'],
  testTimeout: 30000,
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.(m4a|aac|mp3|wav|png|webp|jpg|ttf)$': '<rootDir>/jest/mocks/fileMock.js',
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|@react-navigation|react-native-.*|@shopify/react-native-skia|nitro-core)/)',
  ],
  // Agent worktrees live in .claude/worktrees; keep their copies out of this checkout's module map.
  modulePathIgnorePatterns: ['<rootDir>/.claude/'],
  testPathIgnorePatterns: [
    '/node_modules/',
    '<rootDir>/.claude/',
    '<rootDir>/android/',
    '<rootDir>/e2e/',
  ],
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/*.d.ts', '!src/**/*.generated.ts'],
};
