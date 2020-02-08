const { pathsToModuleNameMapper } = require('ts-jest/utils');
const { compilerOptions } = require('./tsconfig');

module.exports = {
  transform: { '\\.(t|j)s$': ['ts-jest'] },
  preset: 'ts-jest',
  verbose: true,
  moduleNameMapper:
    compilerOptions.paths &&
    pathsToModuleNameMapper(compilerOptions.paths, {
      prefix: '<rootDir>/'
    })
};
