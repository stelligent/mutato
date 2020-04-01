# Concepts

Mutato is an extremely opinionated framework out of the box, while leaving total
control and extendibility through [AWS CDK](https://aws.amazon.com/cdk/).

Mutato works over a single GitHub repository and a single branch of that repo.

The combination of a Github repo and a branch is considered a _project_ in this
toolset. That means you can have separate projects over different branches of
your repositories.

> [!NOTE] Keep in mind that the practicality of having separate projects over
> multiple branches is almost non existent. Ideally you always want to have a
> single Mutato pipeline over your _master_ branch and update your AWS resources
> on pushes to that branch only.

> [!WARNING] AWS multi-account and multi-region deploys are not supported yet.

## environments

An environment isolates _a set of AWS resources_ inside a single CloudFormation
file. You'd normally use environments to separate development resources from
production resources. Stelligent recommends projects to use at least three
different environments:

- __development__: to be used by developers to rapidly deploying changes
- __acceptance__: to be used by QA engineers to regularly testing pre-release
- __production__: to be used for user-facing resources post-release

If you do not specify different environments in your _mutato.yml_, it is assumed
that you are just developing a non production application and Mutato gives you a
default development environment for it.

## containers

Containers are at at the heart of Mutato. You can define containers to be built
as a part of your project in your AWS account. Currently you can choose to have
containers stored either on AWS ECR or Docker Hub.

> [!TIP] You do not have to have containers defined if you are just using third
> party containers off of Docker Hub (e.g the [nginx
> container](https://hub.docker.com/_/nginx)).

At the moment only Docker containers are supported. It is in our development
roadmap to support other types of containers in future (e.g [_LXC
containers_](https://linuxcontainers.org/)).

## actions

Actions are one-off tasks that run in your Mutato pipeline on every push to the
repository's deployed branch. Think of this similar to how GitHub actions work,
but in a broader sense. Mutato actions are not limited to Docker tasks.

> [!TIP] You can use actions to define automated unit tests. Both in and out of
> container tests are supported.

Currently you can have a CodeBuild job, a [Manual
Approval](https://docs.aws.amazon.com/codepipeline/latest/userguide/approvals-action-add.html),
or an in-container Docker command to be executed in the pipeline. It is in our
development roadmap to support other types of actions such as Jenkins jobs and
External CI jobs (e.g Drone CI).

Actions are triggered by events in the pipeline.

## events

Events are specific points in time in your Mutato pipeline. You can have actions
attached to these events to control the flow of your Mutato pipeline and stop
the execution whenever an action fails.

Events trigger actions in the pipeline.

> [!TIP] Use events to stop your Mutato pipeline early from flowing once unit
> tests fail or code linting does not succeed.
