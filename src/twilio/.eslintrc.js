module.exports = {
  root: false,
  env: {
    node: true,
    es6: true,
    mocha: true,
  },
  extends: [
    'standard',
  ],
  rules: {
    'no-console': process.env.NODE_ENV === 'production' ? 'error' : 'off',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'off',
    'comma-dangle': ['error', 'always-multiline'],
  },
  parserOptions: {
    parser: 'babel-eslint',
    ecmaVersion: 2017,
  },

  overrides: [
    {
      files: ['*.ts'],
      extends: [
        'plugin:@typescript-eslint/recommended',
      ],
    },
    {
      files: ['*.vue', '*.js'],
      extends: [
        'standard',
        'plugin:vue/recommended',
        '@vue/standard',
      ],

      rules: {
        'vue/component-name-in-template-casing': ['error', 'kebab-case'],
        'vue/no-v-html': 'off',
        // @todo remove this asap - add enough tests first
        'vue/name-property-casing': 'off',
        'vue/prop-name-casing': 'off',
        'comma-dangle': ['error', 'always-multiline'],
      },
    },
  ],
}

// module.exports = {
//   root: false,
//   env: {
//     node: true,
//     es6: true,
//     mocha: true,
//   },
//   extends: [
//     'standard',
//     'plugin:@typescript-eslint/recommended',
//     'plugin:vue/recommended',
//     '@vue/standard',
//   ],
//   plugins: [
//     '@typescript-eslint',
//   ],
//   settings: {
//     'import/parsers': {
//       '@typescript-eslint/parser': [
//         '.ts',
//       ],
//     },
//     'import/resolver': {
//       typescript: {},
//     },
//   },
//   rules: {
//     'vue/component-name-in-template-casing': ['error', 'kebab-case'],
//     'vue/no-v-html': 'off',
//     // @todo remove this asap - add enough tests first
//     'vue/name-property-casing': 'off',
//     'vue/prop-name-casing': 'off',

//     'no-console': process.env.NODE_ENV === 'production' ? 'error' : 'off',
//     'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'off',
//     'comma-dangle': ['error', 'always-multiline'],
//   },
//   parserOptions: {
//     parser: 'babel-eslint',
//   },
// }
