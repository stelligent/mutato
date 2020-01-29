# MVP Software Design Document (SDD)

- [MVP Software Design Document (SDD)](#mvp-software-design-document-sdd)
  - [1. Introduction](#1-introduction)
    - [1.1 Purpose](#11-purpose)
    - [1.2 Scope](#12-scope)
    - [1.3 Overview](#13-overview)
    - [1.4 Reference Material](#14-reference-material)
    - [1.5 Definitions and Acronyms](#15-definitions-and-acronyms)
  - [2. Project Overview](#2-project-overview)
  - [3. Project Architecture](#3-project-architecture)
    - [3.1 Directory Layout](#31-directory-layout)
    - [3.2 Program Architecture](#32-program-architecture)
    - [3.3 YAML preprocessing](#33-yaml-preprocessing)
    - [3.4 MVP constructs](#34-mvp-constructs)
    - [3.5 Escape Hatch](#35-escape-hatch)
  - [4. YAML Schema](#4-yaml-schema)

## 1. Introduction

### 1.1 Purpose

This SDD lays out the implementation reference, architecture, and system design
for the MVP of Mu2 project (internally referred to as Mutato).

### 1.2 Scope

Mu2 is a CLI application tool and a consumable library, written in NodeJS, and
powered by AWS CDK. It has a sole purpose, and that is out of the box automation
for containerized applications on AWS ECS all in one place. The scope of this
project is simple:

> this tool was created to simplify the declaration and administration of the
> AWS resources necessary to support microservices.

In other words:

> The Serverless Framework but for Dockerized apps

### 1.3 Overview

This document gives a general description of the functionality, context and
design of Mutato's MVP in section 2. In section 3 of this document, a reference
for the implementation is presented with more details about the inner workings
of Mutato. Finally, section 4 defines a rough YAML schema consumed by Mutato.

### 1.4 Reference Material

- Mu1 (the original Mu project): https://github.com/stelligent/mu
- Mu1 examples and sample YAML files:
  https://github.com/stelligent/mu/tree/develop/examples
- AWS CDK and ecs-patterns module:
  https://docs.aws.amazon.com/cdk/api/latest/docs/aws-ecs-patterns-readme.html

### 1.5 Definitions and Acronyms

Throughout this document Mu, Mutato, and Mu2 are interchangeable and they all
refer to this repository's project.

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

Mu2 spins up a CI/CD Pipeline that manages the Dockerized application's DevOps
life-cycle from build to testing to deploy. A lot like Heroku pipelines.

Mu2 uses the current directory's GIT remote as CodePipeline's source input. For
the MVP only Github remotes are supported.

## 3. Project Architecture

### 3.1 Directory Layout

- `lib/`: is where Mu2 CDK constructs are at
- `bin/`: is where Mu2 CLI code is at
- `docs/`: where relevant docs and design references are at
- `tests/`: is where Mu2 unit tests are at

### 3.2 Program Architecture

Mu2/CDK constructs can be referenced in the `mu.yml` file. Constructs referenced
in the YAML file can be either in the form of a simple string or the following
format: `<package/path>/<construct name>`.

If the string version is given (no slashes in the name), the construct refers to
an internal Mu2 CDK construct under `lib/` (e.g `service` or `database`).

If the package format is given, Mu2 looks under context folder's `node_modules`
directory for the installed package and imports the construct that way. This is
how Mu2 can be extended. Extensibility is only possible in NodeJS for MVP. An
example would be `@aws-cdk/aws-ecs-patterns/ApplicationLoadBalancedEc2Service`.
The example breaks down to package: `@aws-cdk/aws-ecs-patterns` and named type
of `ApplicationLoadBalancedEc2Service`. Another example would be a local module:
`./my-app-constructs/index.js/MyCustomConstruct`. In this example, package is
`./my-app-constructs/index.js` and named type is `MyCustomConstruct`. Package
format resolution is as follows (in order):

1. Mu2 looks for the package under `node_modules`
1. If found, tries to import the type. If fails, proceed to the next step
1. Mu2 looks for a local folder in the context directory
1. If found, tries to import the type. If fails, this is fatal

Every single construct under `lib/` shares a base construct. This base construct
must allow for `async()` construction of all constructs. An example interface in
this model would be:

```JS
interface IBaseConstruct extends CDK.Construct {
  public abstract async synth(): Promise<void>;
}
```

### 3.3 YAML preprocessing

The YAML is pre-processed before construct initialization. A version string must
indicate the version of Mu2 the YAML targets. The YAML file can contain the
following dynamic variables:

- environment strings: `${VAR}` which resolves to the environment variable
- the pointer strings: `${construct:property}`. During initialization, resolves
  to a property of another construct. Pointer strings always contain a colon

The CLI goes through the YAML file, creates a CDK stack and initializes all the
constructs one by one. During the initialization process, a dependency graph is
created between constructs (see https://www.npmjs.com/package/dependency-graph).
Existence of a pointer string in the YAML file constitutes a dependency.

Constructs in the dependency graph are initialized from bottom to top. Top level
is always the CDK stack created by Mu. Cyclic dependencies are considered fatal.

MVP does not concern itself with AWS authentication and multi-account deploys.
MVP simply invokes the CDK CLI and allows CDK to handle authentication.

Mu2 wraps the application's stack in a CI/CD pipeline that builds application's
Dockerfile, puts it through unit tests, and finally deploys to an ECS cluster.

The actual CI/CD pipeline is read from either a `buildspec.yml` file (in case of
CodePipeline) or `.drone.yml` (in case of Drone CI). Mu2 injects its own steps
inside the given pipeline. If none of these files are provided, Mu2 generates a
sample one for the user which is just functional enough to get the application
working and deployed.

### 3.4 MVP constructs

1. `service`: can be a Dockerfile running either on ECS-EC2 or Fargate
1. `database`: can have different engine types, focus on serverless
1. `storage`: can be either S3 or EFS mounted inside containers
1. `cache`: can be either Memcached or ElastiCache, or CloudFront
1. `queue`: can be a Dockerfile triggered by SQQ task items
1. `task`: can be a Dockerfile triggered by CloudWatch
1. `cluster`: to customize the ECS service's cluster
1. `network`: to customize the VPC params
1. `cicd`: can be either CodePipeline or Drone CI
1. `ecr`: the ECR repository where operational Dockerfiles are stored at

MVP constructs are divided in three categories:

1. **operational**: `service`, `queue`, and `task`. All operational constructs
   involve a Dockerfile an somehow running it.
1. **utility**: `database`, `cache`, and `storage`. These constructs are
   magically linked to operational constructs, meaning that if user creates a
   `database` construct, it's automatically available to `service`, `task`, and
   `queue` constructs in the YAML file via environment variables to their
   Dockerfile during runtime. This is much like how Heroku plugins and Dynos
   work. If user creates a Heroku supported plugin, it auto-magically appears as
   environment variables inside Dynos. This also applies to the `storage`
   construct.
1. **infra**: infrastructure level constructs. These are necessary for utility
   and operational constructs to run. They include resources like a VPC and an
   ECS cluster. These constructs are currently `cluster`, `network`, and `cicd`

### 3.5 Escape Hatch

Mu2 provides a one-time escape hatch mechanism just like CDK itself. This Escape
hatch is a JavaScript file that implements the following interface:

```TS
interface IEscapeHatch extends CDK.IAspect {
  public abstract async process(stack:CDK.Construct): Promise<CDK.Construct>;
}
```

The interface is optional and will be triggered after Mu2 is finished generating
the app's entire pipeline. This is to provide one last opportunity to customize
the pipeline.

## 4. YAML Schema

```YAML
# this can be omitted, and if omitted, the current version of the CLI is assumed
version: 2.0

# this is static, top level stack key
mu:
  # name of the construct (used as ID when passed to CDK.Construct)
  app:
    # type of the construct (used as right hand side of new() upon construction)
    type: service
    # anything else other than "type" is serialized into an object and passed as
    # the third parameter to the CDK.Construct
    provider: fargate
    port: 8000
    env:
      - foo: bar
      # this is pre-processed to "DOO" env var
      - doo: ${DOO}
      # this creates a dependency between "app" and "customInstance". this will
      # cause "customInstance" to be created first
      - var: ${customInstance:instanceId}

  db:
    type: database
    provider: serverless-aurora
    engine: mysql
    username: ${DB_USER}
    password: ${DB_PASS}

  data:
    type: storage
    provider: s3
    bucket: ${BUCKET_NAME}

  # example of a custom resource
  # https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-ec2.Instance.html
  customInstance:
    type: @aws-cdk/aws-ec2/Instance
    instanceType: t2-micro
    machineImage: 'whatever-ami'
    # "network" is a construct of type "infra". it's automatically created and
    # can be customized by providing a "network:" key in this YAML file.
    vpc: ${network:vpc}
```
