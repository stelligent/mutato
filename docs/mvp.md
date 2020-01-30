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
    - [3.5 Integration With External CIs](#35-integration-with-external-cis)
    - [3.6 Authentication and Multi-Environment Deploys](#36-authentication-and-multi-environment-deploys)
    - [3.7 Self-Healing and Self-Updating](#37-self-healing-and-self-updating)
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

- Mu1 (the original Mu project): <https://github.com/stelligent/mu>
- Mu1 examples and sample YAML files:
  <https://github.com/stelligent/mu/tree/develop/examples>
- AWS CDK and ecs-patterns module:
  <https://docs.aws.amazon.com/cdk/api/latest/docs/aws-ecs-patterns-readme.html>

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
in the YAML file refer to internal Mu2 CDK construct under `lib/` (e.g `service`
or `database`).

Every single construct under `lib/` shares a base construct. This base construct
must allow for `async()` construction of all constructs. An example interface in
this model would be:

```JS
interface IBaseConstruct extends CDK.Construct {
  public abstract async synth(): Promise<void>;
}
```

### 3.3 YAML preprocessing

YAML ingested by Mu2 is a [Nunjucks](https://mozilla.github.io/nunjucks/) file.
Naturally all features of Nunjucks are supported such as includes, blocks, loops
and dynamic function calls (Nunjucks filters).

A version string must indicate the version of Mu2 the YAML targets. If version
is missing from the file, latest version is assumed and user should be warned
about it and encouraged to include a version string.

The YAML file can contain the following dynamic Nunjucks filters:

- environment strings: `{{ env(VAR) }}` resolves to the environment variable
- SSM parameters: `{{ ssm(property) }}`. String parameters resolved through SSM.
  StringList parameters are divided by their comma and turned into a javascript
  string array.
- AWS Secrets Manager parameters: `{{ asm(property) }}`. Parameters resolved by
  a lookup in AWS Secrets Manager.
- Shell command output: `{{ cmd(script) }}`. Parameter resolved by execution of
  a shell script on the machine executing Mu2.

`env`, `ssm`, `cmd`, and `asm` are custom Nunjucks filters provided by Mu2.

### 3.4 MVP constructs

1. `service`: can be a Dockerfile running either on ECS-EC2 or Fargate
1. `database`: can have different engine types, focus on serverless
1. `storage`: can be either S3, or EFS mounted inside containers
1. `cache`: can be either Memcached, ElastiCache, or CloudFront
1. `queue`: can be a Dockerfile triggered by SQS task items
1. `task`: can be a Dockerfile triggered by CloudWatch
1. `cluster`: to customize the ECS service's cluster
1. `network`: to customize networking an VPC params
1. `cicd`: CodePipeline, External CI, and Docker configuration

MVP constructs are divided in three categories:

1. **operational**: `service`, `queue`, and `task`. All operational constructs
   involve a Dockerfile and somehow running it.
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
   ECS cluster. These constructs are currently `cluster`, `network`, and `cicd`.

### 3.5 Integration With External CIs

One of the core philosophies of Mu2 is being CI-agnostic (compare this to Mu1
where the tool is tightly integrated with CodeBuild). This section talks about
an abstract integration plan with External CIs.

The integration with any external CI makes two basic assumptions:

1. The external CI is able to be triggered programmatically
1. The external CI is able to report back to CodePipeline at the end of builds

Mu2 always creates a CodePipeline for containerized application's life cycle.
This pipeline uses CodePipeline Custom Actions to create a job for an external
CI and the external CI is triggered programmatically by polling jobs from Mu2's
pipeline. CodePipeline waits for this custom action to be finished. The external
CI then reports back to CodePipeline that the job has finished.

This is the flow of Mu2's CodePipeline:

1. Mu2 gathers information about the Docker repository in the `cicd` tag
1. Operational Dockerfiles are built and pushed to the repository
1. External CI is triggered for testing
1. If CI step reports back success, deploy to ECS
1. If CI step reports back failure, skip deploy to ECS
1. Optionally notify users through SNS or Slack messages

Mu2 is opinionated about user's source code following the Git Flow model, hence
the master branch is assumed to be the release branch and push to other branches
do not result in ECS deploys. They just result in building and testing. Release
branch is configurable in the `cicd` tag.

For MVP only CodeBuild is included. Since CodeBuild is natively supported by
CodePipeline, a custom action is not required to trigger it obviously.

Drone CI and Jenkins are planned for future
releases. Jenkins already solves most of the problems of integration through the
Jenkins [construct in CDK](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-codepipeline-actions.JenkinsAction.html).
Drone CI provides [programmatic triggers](https://github.com/drone/drone/issues/2679)
but requires more manual labor to integrate compared to Jenkins.

### 3.6 Authentication and Multi-Environment Deploys

MVP does not concern itself with authentication and multi-environment deploys.
MVP simply invokes the CDK CLI and allows CDK to handle authentication.

Mu2 creates a CI/CD pipeline that builds application's Dockerfile, puts it
through unit tests (through external CI), and finally deploys to an ECS cluster.

### 3.7 Self-Healing and Self-Updating

MVP provides a _self-healing_ CodePipeline. That means changes to the underlying
`mu.yml` file causes an update to its CodePipeline automatically. Mu2's pipeline
is implemented using CDK app-delivery module that enables it to self-heal.

## 4. YAML Schema

Top level node in the YAML file is always `mu`. under that, the following format
is acceptable as constructs:

```YAML
# shorthand version
<type>:
  prop1: val1
  prop2: val2
  prop3: ...

# explicit version
<name>:
  type: <type>
  prop1: val1
  prop2: val2
  prop3: ...
```

Combination of `<name>` and `<type>` is unique across the YAML file. Shorthand
version is provided since `infra` constructs can only appear exactly once and it
is confusing to write them as name/type (as it indicates it can be more than one
and having a name is unnecessary in that case). In the shorthand version, type
is inferred from the name directly. Lack of a _type_ prop indicates a shorthand
version of a construct.

Here is a sample `mu.yml`:

```YAML
version: 2.0

mu:
  app1:
    type: service
    provider: fargate
    port: 8000
    env:
      - doo: {{ env("FOO") }}

  app2:
    type: service
    provider: fargate
    port: 9000
    env:
      - doo: {{ env("BAR") }}

  database:
    provider: serverless-aurora
    engine: mysql
    username: {{ env("DB_USER") }}
    password: {{ ssm("/path/to/pass") }}

  cicd:
    docker:
      repo: {{ env("DOCKER_REPO") }}
      user: {{ env("DOCKER_USER") }}
      pass: {{ ssm("/path/to/pass") }}
```
