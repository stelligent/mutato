# Mutato

> [!NOTE] If you are coming from the original [Stelligent
> Mu](https://github.com/stelligent/mu), keep in mind that Mutato is a successor
> to Mu. While there are many similarities between the two projects, currently
> we are not planning to provide any compatibilities between the two.

[Stelligent Mutato](https://github.com/stelligent/mu) is an open-source
framework for building containerized micro-services on the AWS ecosystem (e.g
ECS or Fargate). Mutato is designed to leverage [AWS Cloud Development Kit
(CDK)](https://docs.aws.amazon.com/cdk/latest/guide/home.html) constructs which
abstract the complexity of writing a safe and secure CloudFormation file to
deploy and automate micro-service deployments.

## Getting Started

Create a simple _mutato.yml_ file in your Github repository:

```YAML
---
environments:
  - acceptance
  - production
---
resources:
  - service:
      provider: fargate
      container: nginx:latest
  - network:
      vpc:
        maxAZs: {{ 1 if environment == "acceptance" else 3 }}
```

Obtain a [GitHub OAuth
token](https://help.github.com/en/actions/configuring-and-managing-workflows/authenticating-with-the-github_token).
We assume you have this available in your `$PATH` under `$GITHUB_TOKEN`. Execute
the following to deploy your microservice:

```bash
$ echo $GITHUB_TOKEN > mutato.env
$ aws-vault exec <profile name> -- env | grep AWS_ >> mutato.env
$ docker run --env-file mutato.env stelligent/mutato bootstrap
$ docker run --env-file mutato.env -v /path/to/your/github/repo:/project stelligent/mutato deploy
```

This gives you a load balanced NGINX server in two separate environments and the
_acceptance_ environment has its VPC AZ capacity set to 1 to reduce costs.

## Where To Head Next

- To learn more about what you can write in _mutato.yml_, head over to its
  [reference schema](mutato-yaml) page.
- To learn more about what you can do with the Mutato Docker container, head
  over [to its page](mutato-docker).
- To learn more about extensibility of Mutato, read [its extensibility
  documentation](mutato-cdk).
- If you are looking for the auto generated low level CDK api documentation, [go
  to API](api)

## AWS Environment

We highly recommend you use [aws-vault](https://github.com/99designs/aws-vault)
to manage your AWS environment. If you choose not to, you should manually create
your `mutato.env` file with at least the following environment variables:

- _AWS_DEFAULT_REGION_
- _AWS_ACCESS_KEY_ID_
- _AWS_SECRET_ACCESS_KEY_

Consult [Docker run](https://docs.docker.com/engine/reference/commandline/run)'s
documentation on the format of the `mutato.env` file. Consult [AWS
CLI](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-envvars.html)'s
documentation for the environment variables you may need to set manually.

## Supported Platforms

Mutato has been mostly developed and tested on Linux 64bit (Ubuntu 18.04 LTS).
The core codebase is in typescript and uses CDK, therefore in theory it should
run anywhere that is capable of running a Docker container or node and npm, but
the official support is mostly provided for the Linux 64bit platform.

## Stability

Currently Mutato is under active development. Expect an alpha quality software
and things rapidly changing until we announce our stable v1.0.

Do not use this in production yet!

<small>...or do. test in production amirite?</small>

![At that part, I'm a pro](pro.gif)
