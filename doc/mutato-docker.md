# Docker Container Documentation

Mutato's Docker container is the preferred and recommended way to quickly get up
and running with the toolset.

The container conveniently packages all the dependencies needed to successfully
deploy with Mutato.

The container ships with the version of CDK we use in Mutato to ensure no
collision happens between user's environment and what Mutato uses.

## Container Commands

### `docker run ... stelligent/mutato bootstrap`

This is the one-time setup needed to be executed for each AWS account mutato is
going to be used. This is currently just the same as `cdk bootstrap`.

### `docker run ... stelligent/mutato destroy`

This destroys all the resources deployed by mutato for the current branch.

### `docker run ... stelligent/mutato deploy`

This deploys _mutato.yml_ for the current branch into your AWS account.

### `docker run ... stelligent/mutato synth`

This is essentially a dry-run of deploy. It only generates the CloudFormation
files used during deployment. This can be used in a CI to catch errors in a
_mutato.yml_ file before it actually deploys.

### `docker run ... stelligent/mutato cdk`

> [!WARNING] Advanced users only! If you do not know what you are doing and do
> not know how to work with CDK, running commands directly through CDK may
> damage your deployed stacks!

This gives you access to the bundled CDK.
