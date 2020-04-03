# Pipeline Architecture

> [!NOTE] this page is aimed at advanced audiences, already familiar with CDK.

Mutato is a TypeScript CDK application. It is executed via CDK's CLI. During
execution, the entrypoint of the CDK application looks for two things:

1. A GitHub repository on the disk
2. A `mutato.yml` in it

After that, Mutato processes `mutato.yml` and creates all the relevant resources
using CDK constructs.

Mutato deploys itself using [CDK's
app-delivery](https://docs.aws.amazon.com/cdk/api/latest/docs/app-delivery-readme.html)
module. Mutato's pipeline then manages exactly one other CloudFormation resource
per `environment` tag in the `mutato.yml` file.

All the containers and actions are owned by the master app-delivery pipeline and
are processed before `environment` CloudFormation resources are updated on every
push to the GitHub repository.

This is the graph of a Mutato pipeline:

```MARKDOWN
  ┏━━━━━━━━━━━━━━━━┓  ┏━━━━━━━━━━━━━━━━┓  ┏━━━━━━━━━━━━━━━━━┓  ┏━━━━━━━━━━━━━━━━━┓  ┏━━━━━━━━━━━━━━━━━┓  ┏━━━━━━━━━━━━━━━━━┓  ┏━━━━━━━━━━━━━━━━━┓  ┏━━━━━━━━━━━━━━━━━┓  ┏━━━━━━━━━━━━━━━━━┓
  ┃     Source     ┃  ┃     Synth      ┃  ┃      Update     ┃  ┃    Container    ┃  ┃    Container    ┃  ┃    Container    ┃  ┃   Environment   ┃  ┃   Environment   ┃  ┃   Environment   ┃ ...
  ┃                ┃  ┃                ┃  ┃                 ┃  ┃    Pre-Build    ┃  ┃   Build & Push  ┃  ┃    PostBuild    ┃  ┃    PreDeploy    ┃  ┃     Deploy      ┃  ┃   Post-Deploy   ┃ ...
  ┃ ┌────────────┐ ┃  ┃ ┌────────────┐ ┃  ┃ ┌─────────────┐ ┃  ┃ ┌─────────────┐ ┃  ┃ ┌─────────────┐ ┃  ┃ ┌─────────────┐ ┃  ┃ ┌─────────────┐ ┃  ┃ ┌─────────────┐ ┃  ┃ ┌─────────────┐ ┃ ...
  ┃ │   GitHub   ┣━╋━━╋━▶ Mutato/CDK ┣━╋━━╋━▶     CFN     ┣━╋━━╋━▶   Actions   ┣━╋━━╋━▶  CodeBuild  ┣━╋━━╋━▶   Actions   ┣━╋━━╋━▶   Actions   ┣━╋━━╋━▶     CFN     ┣━╋━━╋━▶   Actions   │ ┃ ...
  ┃ └────────────┘ ┃  ┃ └────────────┘ ┃  ┃ └─────────────┘ ┃  ┃ └─────────────┘ ┃  ┃ └─────────────┘ ┃  ┃ └─────────────┘ ┃  ┃ └─────────────┘ ┃  ┃ └─────────────┘ ┃  ┃ └─────────────┘ ┃ ...
  ┗━━━━━━━━━━━━━━━━┛  ┗━━━━━━━━━━━━━━━━┛  ┗━━━━━━━━━━━━━━━━━┛  ┗━━━━━━━━━━━━━━━━━┛  ┗━━━━━━━━━━━━━━━━━┛  ┗━━━━━━━━━━━━━━━━━┛  ┗━━━━━━━━━━━━━━━━━┛  ┗━━━━━━━━━━━━━━━━━┛  ┗━━━━━━━━━━━━━━━━━┛
```

_CFN_ refers to CloudFormation. The last three boxes loop over for how ever many
`environment` tags present in the `mutato.yml` file.
