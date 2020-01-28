# MVP Software Design Document (SDD)

## 1. Introduction

### 1.1 Purpose

This SDD lays out the implementation reference, architecture, and system design
for the MVP of Mu2 project (internally referred to as Mutato).

### 1.2 Scope

Mu is a CLI application tool and a consumable library, written in NodeJS, and
powered by AWS CDK. It has a sole purpose, and that is out of the box automation
for containerized applications on AWS ECS all in one place. The scope of this
project is simple:

> this tool was created to simplify the declaration and administration of the
> AWS resources necessary to support microservices.

### 1.3 Overview

This document gives a general description of the functionality, context and
design of Mutato's MVP in section 2. In section 3 of this document, a reference
for the implementation is presented with more details about the inner workings
of Mutato. Finally, section 4 defines the YAML schema consumed by Mutato.

### 1.4 Reference Material

- Mu1 (the original Mu project): https://github.com/stelligent/mu
- Mu1 examples and sample YAML files:
  https://github.com/stelligent/mu/tree/develop/examples
- AWS CDK and ecs-patterns module:
  https://docs.aws.amazon.com/cdk/api/latest/docs/aws-ecs-patterns-readme.html

### 1.5 Definitions and Acronyms

Throughout this document Mu, Mutato, and Mu2 are interchangeable and they
all refer to this repository's project.

## 2. Project Overview

Mu2 consumes a simple to write and comprehend YAML file that contains everything
about an infrastructure around a containerized application. This application can
have access to various databases, stay behind a load balancer, be served through
CloudFront or anything else that can be related to an ECS app.

The point of entry to Mu2 is a YAML file, named `mu.yml` by default. Mu2 in its
CLI form can be invoked by passing this YAML file in and a context directory.
Context directory is set to `$CWD` of where Mu2 CLI is being invoked.

Mu2 in its library form is a collection of useful CDK constructs that power Mu2
itself. The constructs can be used in any other CDK app. CLI's point of entry is
also provided as a consumable library function and returns a CDK stack.

Mu2 spins up a multi-environment CodePipeline that manages the ECS application's
DevOps life-cycle and promotes it from Dev to QA to Prod on successful pushes.

Mu2 uses the current directory's GIT remote as CodePipeline's source input. For
the MVP only Github remotes are supported.

## 3. Project Architecture

### 3.1 Directory Layout

- `lib/`: is where Mu2 CDK constructs are at
- `bin/`: is where Mu2 CLI code is at
- `docs/`: where relevant docs and design references are at
- `tests/`: is where Mu2 unit tests are at
- `index.js`: Mu2's entry point

Every single construct under `lib/` shares a base construct. This base construct
must allow for `async()` construction of all constructs. An example interface in
this model would be:

```JS
interface IBaseConstruct extends CDK.Construct {
  public abstract async synth(): Promise<void>;
}
```

### 3.2 EntryPoint Architecture

Mu2/CDK constructs can be referenced in the `mu.yml` file. Constructs referenced
in the YAML file can be either in the form of a simple string or the following
format: `<package name>/<construct name>`.

If the string version is given (no slashes in the name), the construct refers to
an internal Mu2 construct under `lib/` (e.g `MuFargate`).

If the package format is given, Mu2 looks under context folder's `node_modules`
directory for the installed package and imports the construct that way. This is
how Mu2 can be extended. Extensibility is only possible in NodeJS in MVP. An
example would be `@aws-cdk/aws-ecs-patterns/ApplicationLoadBalancedEc2Service`.
The example breaks down to package: `@aws-cdk/aws-ecs-patterns` and named type
of `ApplicationLoadBalancedEc2Service`. Another example would be a local module:
`./my-app-constructs/index.js/MyCustomConstruct`. In this example, package is
`./my-app-constructs/index.js` and named type is `MyCustomConstruct`. This can
be inferred by the fact that this string starts with `./`.

The YAML is pre-processed before construct initialization. The YAML file can
contain the following dynamic variables:

- environment strings: `${VAR}` which resolves to the environment variable
- the pointer strings: `${construct:property}`. During initialization,
  resolves to a property of a construct. Pointer strings always contain a colon

The CLI goes through the YAML file, creates a CDK stack and initializes all the
constructs one by one. During the initialization process, a dependency graph is
created between constructs (see https://www.npmjs.com/package/dependency-graph).
Existence of a pointer string in the YAML file constitutes a dependency.

Constructs in the dependency graph are initialized from bottom to top. Top level
is always the CDK stack created by Mu. Cyclic dependencies are considered fatal.

MVP does not concern itself with AWS authentication and multi-account deploys.
MVP simply invokes the CDK CLI and allows CDK to handle authentication.

Mu2 wraps the application's stack in a CodePipeline that builds application's
Dockerfile, puts it through unit tests, and finally deploys to an ECS cluster.
