import babel from '@rollup/plugin-babel';
import resolve from '@rollup/plugin-node-resolve';
import pkg from './dim-api-types/package.json' assert { type: 'json' };

const extensions = ['.js', '.jsx', '.ts', '.tsx'];

export default {
  input: './api/shapes/index.ts',

  // Specify here external modules which you don't want to include in your bundle (for instance: 'lodash', 'moment' etc.)
  // https://rollupjs.org/guide/en/#external
  external: [],

  plugins: [
    // Allows node_modules resolution
    resolve({ extensions }),

    // Compile TypeScript/JavaScript files
    babel({
      extensions,
      babelHelpers: 'bundled',
      include: ['api/**/*'],
    }),
  ],

  output: [
    {
      file: 'dim-api-types/' + pkg.main,
      format: 'cjs',
    },
    {
      file: 'dim-api-types/' + pkg.module,
      format: 'es',
    },
  ],
};
