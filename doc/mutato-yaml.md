# YAML Reference Specification

_mutato.yml_ is a multi-document YAML file. Each section is divided by the "---"
identifier. _mutato.yml_ is also a
[Nunjucks](https://mozilla.github.io/nunjucks/templating.html) enabled file. You
can use all that Nunjucks has to offer.

Mutato offers two builtin Nunjucks functions:

- `env("string")`: that resolves to environment variable `string`
- `cmd("string")`: that resolves to the output of shell command `string`

Mutato also offers a special `environment` Nunjucks variable inside the
_resources_ section to provide environment specific configuration.

Example use of Nunjucks is provided below in the reference YAML.

```YAML
---
# this section defines the isolated environments "resources" will deploy to.
# best practice is to separate development and production environments on AWS.
environments:
  # an environment can simply be a string
  - acceptance
  # an environment can also be an object
  - production:
  # events guard the deployment of an environment. use it to run tests
      events:
        # two supported events are: "pre-deploy" and "post-deploy"
        pre-deploy: production-pre-deploy-action
        post-deploy: production-post-deploy-action
---
# this section defines actions that are triggered on certain events
# "actions" section is an array of objects
actions:
  # use docker action to run a simple docker command. your GitHub's source is
  # automatically mounted in command's current working directory
  - docker:
      name: production-post-deploy-action
      # you can reference containers on DockerHub just by their name
      container: ubuntu
      cmd: exit 0

  # use approval action to wait for a real human's approval in the pipeline
  - approval:
      name: production-pre-deploy-action
      # optionally provide a list of emails to notify
      emails:
        - sysadmin1@example.com
        - sysadmin2@example.com

  # use codebuild action execute a CodeBuild build spec
  - codebuild:
      name: container-pre-build-action
      # this can also be an inline object here
      spec: /path/to/buildspec.yml
      privileged: true

  - approval:
      name: container-pre-build-action
---
# this section defines containers used by actions and resources
# "containers" section is an array of objects
containers:
  # array key is container's type. currently only "docker" is supported
  - docker:
      # a required name for your container
      name: mutato
      # path to a docker file to build in the pipeline
      file: Dockerfile
      events:
        # two supported events are: "pre-build" and "post-build"
        pre-build: container-pre-build-action
        post-build: container-post-build-action

  # you can also specify a container on the DockerHub
  - docker:
      name: latest-nginx
      uri: nginx:latest
---
# this section defines the actual resources deployed in each environment
# you can use environment specific resources definitions here
resources:
  # a service can be any of:
  # - "fargate": container running in Fargate
  # - "classic": container running in EC2 ECS
  # - "fargate-task": Fargate container triggered by CloudWatch rate expressions
  # - "classic-task": EC2 ECS container triggered by CloudWatch rate expressions
  # - "fargate-queue": Fargate container triggered by SQS messages
  # - "classic-queue": EC2 ECS container triggered by SQS messages
  - service:
      provider: fargate
      # you can reference your container from the "container" section here by
      # name or you can just provide a DockerHub uri
      container: mutato

  # you can create a storage for your container, all your "service" containers
  # get access to "storage"s in runtime via environment variables
  - storage:
      provider: s3
      # this is how "env" function can be used
      name: bucket-{{ env("BUCKET_NAME") }}

  - storage:
      provider: sqs
      # this is how "cmd" function can be used
      name: queue-{{ cmd("echo $BUCKET_NAME") }}

  # you can also create a database for your service definitions. similar to
  # storage definitions, you get access to these in runtime via environment
  # variables into your containers
  - database:
      provider: dynamo

  # you can perform environment specific configuration through Nunjucks
  - network:
      vpc:
        # this is how "environment" Nunjucks variable can be used
        maxAZs: {{ 1 if environment == "acceptance" else 3 }}
```
