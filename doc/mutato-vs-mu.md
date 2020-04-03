# Mutato vs. Mu

The OG [Stelligent Mu](https://github.com/stelligent/mu) is a framework similar
to Mutato where it aims at deploying microservices with ease.

Throughout the years thanks to the community of Mu-users, Stelligent received a
lot of valuable feedback which sparked the creation of Mutato.

Mutato at its core does exactly what Mu does but with a lot of added benefits.
Some of these benefits are listed below.

## Extensibility

The original Mu is written in Go and leaves almost no room for integration into
third party applications. Stelligent has received a lot of requests from its
enterprise users to change Mu so that it can be extended and integrated so
enterprise applications can customize it to their heart's desire.

Mutato on the other hand is written on top of the powerful AWS Cloud Development
Kit and at its core is a collection of CDK constructs which can be customized to
the teeth!

## Multi-Branch Deploys

In mutato, every single branch is isolated from other branches. This is similar
to how a properly configured CI system reacts to changes in a repository. You
can have entirely different isolated AWS deployments over different branches.

This feature is absent in the original Mu and was priority number 1 since day 1
for Mutato and its delivery pipeline.

## CI-Agnostic

The OG Stelligent Mu is heavily integrated with CodeBuild and leaves almost no
room to integrate with external CI systems such as Drone CI and Jenkins. Users
of the original Mu has always requested us to add support for Jenkins into Mu
for enterprise applications.

This is now possible due to the architecture of Mutato and the fact that it is
built upon CDK and its constructs. Mutato uses CodeBuild internally, but it also
offers ad-hoc support foundation for other CI systems.
