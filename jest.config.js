const { pathsToModuleNameMapper } = require('ts-jest');
const { compilerOptions } = require('./tsconfig');

module.exports = {
  transform: { '\\.ts$': ['ts-jest'] },
  preset: 'ts-jest',
  verbose: true,
  moduleNameMapper:
    compilerOptions.paths &&
    pathsToModuleNameMapper(compilerOptions.paths, {
      prefix: '<rootDir>/',
    }),
  modulePathIgnorePatterns: ['<rootDir>/dist/'],
  setupFiles: ['dotenv/config'],
};
