# Mutato

Stelligent Mutato is an open-source framework for building containerized micro-services on the AWS ecosystem (e.g ECS, EKS, or Fargate). Mutato is an improvement on [Mu](https://github.com/stelligent/mu), designed to leverage [AWS CDK](https://docs.aws.amazon.com/cdk/latest/guide/home.html) constructs which abstract the complexity of writing a safe and secure CloudFormation file to deploy and automate micro-service deployments.

_The truth is out there._

## Getting started

Currently, there are no prequisites to getting started.

Pull the project and run `npm install`.

Verify the installation was successfull with `npm build`


## Contributing

Contributions to the project are always welcome! Review the [Contribution Guide](CONTRIBUTING.md) so we're all on the same page.


## Documentation

Designs, diagrams, and other documentation can be found in [`docs`](docs/). Code documentation is auto-generated, provided by [typedoc](https://typedoc.org/) and enforced by [eslint](https://github.com/typescript-eslint/typescript-eslint) with the [eslint-plugin-jsdoc](https://github.com/gajus/eslint-plugin-jsdoc) plugin. See the `package.json` `docs:generate` script for exact usage. Note that Eslint is used in favor of [Tslint](https://github.com/palantir/tslint) due to the deprecation of that project.

Documentation linting standards are provided with the following plugins recommended guidelines:

| Project | Guideline(s) | Description |
| --- | --- | --- |
| [typescript-eslint](https://github.com/typescript-eslint/typescript-eslint) |  `plugin:@typescript-eslint/recommended` and `plugin:@typescript-eslint/recommended-requiring-type-checking` | for typescript support |
| [eslint-plugin-jsdoc](https://github.com/gajus/eslint-plugin-jsdoc#configuration) | `plugin:jsdoc/recommended` | for documentation linting |
| [eslint-plugin-prettier](https://github.com/prettier/eslint-plugin-prettier#recommended-configuration) | `plugin:prettier/recommended` | for code linting |


## Q & A

**Q)** When I run `npm install` I get a `gyp ERR` error `(Error: Command failed: {home}/.pyenv/shims/python -c import sys; print "%s.%s.%s" % sys.version_info[:3];)`. What gives?

**A)** Your node gyp is using python 3+ to execute a non python 3+ compatible script. You can either:
* Switch the python versios to one supported by that gyp version (i.e. 2.7.10) using pyenv or similar _(preferred)_
* Update the gyp version to one compatible with [python 3](https://github.com/nodejs/node-gyp/tree/v6.1.0)
	
Then, rerun `npm install`. 

