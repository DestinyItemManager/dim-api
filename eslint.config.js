import eslint from '@eslint/js';
import * as regexpPlugin from 'eslint-plugin-regexp';
import sonarjs from 'eslint-plugin-sonarjs';
import globals from 'globals';
import tseslint from 'typescript-eslint';

// TODO: different configs for JS vs TS
export default tseslint.config(
  { name: 'eslint/recommended', ...eslint.configs.recommended },
  ...tseslint.configs.recommendedTypeChecked,
  {
    name: 'typescript-eslint/parser-options',
    languageOptions: {
      parserOptions: {
        project: './api/tsconfig.eslint.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  ...tseslint.configs.stylisticTypeChecked,
  regexpPlugin.configs['flat/recommended'],
  { name: 'sonarjs/recommended', ...sonarjs.configs.recommended },
  {
    name: 'global ignores',
    ignores: ['*.test.ts', '*/migrations/*'],
  },
  {
    name: 'dim-api-custom',
    languageOptions: {
      ecmaVersion: 'latest',
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
      sourceType: 'module',
      globals: {
        ...globals.node,
      },
    },
    linterOptions: {
      reportUnusedDisableDirectives: true,
    },
    rules: {
      'no-console': 'off',
      'no-empty': 'off',
      'require-atomic-updates': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          varsIgnorePattern: '(^_|[iI]gnored)',
          argsIgnorePattern: '(^_|[iI]gnored)',
          ignoreRestSiblings: true,
        },
      ],
      'no-restricted-properties': [
        1,
        {
          object: '_',
          property: 'forEach',
          message: 'Please use a for in loop.',
        },
        {
          object: '_',
          property: 'filter',
          message: 'Please use the native js filter.',
        },
        {
          object: '_',
          property: 'map',
          message: 'Please use the native js map.',
        },
        {
          object: '_',
          property: 'uniq',
          message: 'Please use Array.from(new Set(foo)) or [...new Set(foo)] instead.',
        },
        {
          object: '_',
          property: 'forIn',
          message: 'Please use Object.values or Object.entries instead',
        },
        {
          object: '_',
          property: 'noop',
          message:
            'Import noop directly instead of using it through _.noop, to satisfy the unbound-method lint',
        },
        {
          object: '_',
          property: 'groupBy',
          message: 'Use Object.groupBy or Map.groupBy instead.',
        },
        {
          object: '_',
          property: 'cloneDeep',
          message: 'Use structuredClone instead.',
        },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: 'TSEnumDeclaration:not([const=true])',
          message: 'Please only use `const enum`s.',
        },
      ],
      // TODO: Switch to @stylistic/eslint-plugin-js for this one rule
      'spaced-comment': [
        'error',
        'always',
        { exceptions: ['@__INLINE__'], block: { balanced: true } },
      ],
      'arrow-body-style': ['error', 'as-needed'],
      curly: ['error', 'all'],
      eqeqeq: ['error', 'always'],
      'no-return-await': 'off',
      '@typescript-eslint/return-await': ['error', 'in-try-catch'],
      'prefer-regex-literals': 'error',
      'prefer-promise-reject-errors': 'error',
      'prefer-spread': 'error',
      radix: 'error',
      yoda: 'error',
      'prefer-template': 'error',
      'class-methods-use-this': ['error', { exceptMethods: ['render'] }],
      'no-unmodified-loop-condition': 'error',
      'no-unreachable-loop': 'error',
      'no-unused-private-class-members': 'error',
      'func-name-matching': 'error',
      'logical-assignment-operators': 'error',
      'no-lonely-if': 'error',
      'no-unneeded-ternary': 'error',
      'no-useless-call': 'error',
      'no-useless-concat': 'error',
      'no-useless-rename': 'error',
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/no-misused-promises': [
        'error',
        {
          checksVoidReturn: false,
        },
      ],
      '@typescript-eslint/ban-types': 'off',
      '@typescript-eslint/explicit-member-accessibility': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/method-signature-style': 'error',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-var-requires': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-use-before-define': ['error', { functions: false }],
      '@typescript-eslint/no-parameter-properties': 'off',
      '@typescript-eslint/no-extraneous-class': 'error',
      '@typescript-eslint/no-this-alias': 'error',
      '@typescript-eslint/no-unnecessary-type-constraint': 'error',
      '@typescript-eslint/no-unnecessary-boolean-literal-compare': 'error',
      '@typescript-eslint/no-unnecessary-qualifier': 'error',
      '@typescript-eslint/no-unnecessary-type-assertion': 'error',
      '@typescript-eslint/no-unnecessary-type-arguments': 'error',
      '@typescript-eslint/prefer-function-type': 'error',
      '@typescript-eslint/prefer-for-of': 'error',
      '@typescript-eslint/prefer-optional-chain': 'error',
      '@typescript-eslint/prefer-as-const': 'error',
      '@typescript-eslint/prefer-reduce-type-parameter': 'error',
      '@typescript-eslint/prefer-includes': 'error',
      '@typescript-eslint/prefer-string-starts-ends-with': 'error',
      '@typescript-eslint/prefer-ts-expect-error': 'error',
      '@typescript-eslint/prefer-regexp-exec': 'off',
      '@typescript-eslint/array-type': 'error',
      '@typescript-eslint/no-non-null-asserted-optional-chain': 'error',
      '@typescript-eslint/unified-signatures': 'error',
      '@typescript-eslint/no-base-to-string': 'error',
      '@typescript-eslint/non-nullable-type-assertion-style': 'error',
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
      '@typescript-eslint/consistent-type-definitions': 'error',
      '@typescript-eslint/consistent-generic-constructors': 'error',
      '@typescript-eslint/no-duplicate-enum-values': 'error',
      '@typescript-eslint/only-throw-error': 'error',
      '@typescript-eslint/no-unused-expressions': [
        'error',
        { allowShortCircuit: true, allowTernary: true },
      ],
      '@typescript-eslint/no-for-in-array': 'error',
      '@typescript-eslint/consistent-indexed-object-style': 'off',
      '@typescript-eslint/no-floating-promises': 'off',
      '@typescript-eslint/require-await': 'off',
      '@typescript-eslint/no-unsafe-enum-comparison': 'off',
      '@typescript-eslint/prefer-nullish-coalescing': [
        'off',
        {
          ignoreConditionalTests: true,
          ignoreTernaryTests: false,
          ignoreMixedLogicalExpressions: true,
          ignorePrimitives: {
            boolean: true,
            number: false,
            string: true,
          },
        },
      ],
      '@typescript-eslint/no-unsafe-argument': 'error',
      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/no-unsafe-call': 'error',
      '@typescript-eslint/no-unsafe-member-access': 'error',
      '@typescript-eslint/no-unsafe-return': 'error',
      '@typescript-eslint/no-redundant-type-constituents': 'off',
      'no-implied-eval': 'off',
      '@typescript-eslint/no-implied-eval': 'error',
      'sonarjs/cognitive-complexity': 'off',
      'sonarjs/no-small-switch': 'off',
      'sonarjs/no-duplicate-string': 'off',
      'sonarjs/prefer-immediate-return': 'off',
      'sonarjs/no-nested-switch': 'off',
      'sonarjs/no-nested-template-literals': 'off',
    },
  },
  {
    files: ['src/**/*.cjs'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
  {
    name: 'tests',
    files: ['**/*.test.ts'],
    rules: {
      // We don't want to allow importing test modules in app modules, but of course you can do it in other test modules.
      'no-restricted-imports': 'off',
    },
  },
);
