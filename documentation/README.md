# Documentation


## How?

Documentation is provided by [typedoc](https://typedoc.org/) and enforced by [eslint](https://github.com/typescript-eslint/typescript-eslint) with the [eslint-plugin-jsdoc](https://github.com/gajus/eslint-plugin-jsdoc) plugin. See the `package.json` `docs:generate` script for exact usage. Note that Eslint is used in favor of [Tslint](https://github.com/palantir/tslint) due to the deprecation of that project.

Documentation linting standards are provided with the following plugins recommended guidelines:

| Project | Guideline(s) | Description |
| --- | --- | --- |
| [typescript-eslint](https://github.com/typescript-eslint/typescript-eslint) |  `plugin:@typescript-eslint/recommended` and `plugin:@typescript-eslint/recommended-requiring-type-checking` | for typescript support |
| [eslint-plugin-jsdoc](https://github.com/gajus/eslint-plugin-jsdoc#configuration) | `plugin:jsdoc/recommended` | for documentation linting |
| [eslint-plugin-prettier](https://github.com/prettier/eslint-plugin-prettier#recommended-configuration) | `plugin:prettier/recommended` | for code linting |
