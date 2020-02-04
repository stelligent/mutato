module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: './tsconfig.json'
  },
  plugins: [
    '@typescript-eslint',
    'prettier',
    'jsdoc'
  ],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/eslint-recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'plugin:prettier/recommended',
    'plugin:jsdoc/recommended'
  ],
  rules: {
    'jsdoc/require-jsdoc': [
      'error',
      {
        'publicOnly': false,
        'require': {
          'ClassDeclaration':true,
          'MethodDefinition':true
        }
      }
    ],
    'jsdoc/check-examples': [
      'error',
      {
        'baseConfig': {
          'parser': '@typescript-eslint/parser'
        }
      }
    ]
  },
  "settings": {
    jsdoc: {
      mode: 'typescript'
    }
  }
};
