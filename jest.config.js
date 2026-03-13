const { pathsToModuleNameMapper } = require('ts-jest');
const { compilerOptions } = require('./tsconfig.json');

module.exports = {
  projects: [
    {
      displayName: 'unit',
      rootDir: '.',
      roots: ['<rootDir>/src'],
      testMatch: ['<rootDir>/src/**/__tests__/**/*.test.ts'],
      testEnvironment: 'node',
      preset: 'ts-jest',
      moduleNameMapper: pathsToModuleNameMapper(compilerOptions?.paths || {}, {
        prefix: '<rootDir>/',
      }),
      testPathIgnorePatterns: ['/node_modules/', '/dist/'],
      collectCoverageFrom: [
        'src/**/*.ts',
        '!src/**/__tests__/**',
        '!src/**/*.d.ts',
        '!src/main.ts',
      ],
    },
    {
      displayName: 'integration',
      rootDir: '.',
      roots: ['<rootDir>/test'],
      testMatch: ['<rootDir>/test/**/*.int.test.ts'],
      testEnvironment: 'node',
      preset: 'ts-jest',
      moduleNameMapper: pathsToModuleNameMapper(compilerOptions?.paths || {}, {
        prefix: '<rootDir>/',
      }),
      testPathIgnorePatterns: ['/node_modules/', '/dist/'],
      setupFilesAfterEnv: ['<rootDir>/test/integration/helpers/setup.ts'],
      globalTeardown: '<rootDir>/test/integration/helpers/teardown.ts',
    },
  ],
};
