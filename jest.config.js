import { pathsToModuleNameMapper } from 'ts-jest';
import tsConfig from './tsconfig.json' assert { type: 'json' };
export default {
  transform: {
    '\\.ts$': ['ts-jest'],
  },
  preset: 'ts-jest',
  verbose: true,
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    ...(tsConfig.compilerOptions.paths &&
      pathsToModuleNameMapper(tsConfig.compilerOptions.paths, {
        prefix: '<rootDir>/',
      })),
    // Jest-resolve doesn't know that Node wants .js extensions in imports
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  modulePathIgnorePatterns: ['<rootDir>/dist/'],
  setupFiles: ['dotenv/config'],
};
