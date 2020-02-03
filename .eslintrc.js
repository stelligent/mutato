module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: [
    '@typescript-eslint',
    'prettier',
    'jsdoc'
  ],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/eslint-recommended',
    'plugin:@typescript-eslint/recommended',
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
    ]
  }
};
