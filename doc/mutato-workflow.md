# Deploy Workflow

This workflow is to be followed from top to bottom.

## prepare your environment

You need the following environment variables defined:

- `GITHUB_TOKEN`: your GitHub Personal Access Token
- `AWS_*`: your AWS account credentials
- `DOCKER_USERNAME` and `DOCKER_PASSWORD` _optional_ and only if you are using
  Docker Hub for your containers

## prepare your `mutato.yml`

Everything begins with a `mutato.yml` in a branch of a GitHub repository. Once
you have yourself a valid `mutato.yml` file. You can use Mutato's Docker image
to deploy that branch to your AWS account.

## bootstrap (one time)

```bash
$ docker run ... stelligent/mutato bootstrap
```

Before you can deploy, you need to execute a one-time `bootstrap` script. This
currently just bootstraps CDK in your AWS account.

> [!TIP] You can skip this if you have other CDK projects in your account.

## deploy (one time<sup>†</sup>)

```bash
$ docker run ... stelligent/mutato deploy
```

You may deploy to your account with this command. You only need to execute this
once in your computer's local terminal. This command freezes your environment's
relevant variables and sends them to your AWS account.

Mutato pipeline is self-healing, meaning that most changes to your `mutato.yml`
automatically updates the pipeline itself in your AWS account. You do not need
to manually run `deploy` every time you make a change, The pipeline detects
changes and updates itself.

> [!NOTE] __†__  if you ever makes changes to your `mutato.yml` that involves
> adding or removing environment variables through Nunjucks's `env(...)` and
> `cmd(...)` directives, you need to deploy from your computer's terminal again.

## push changes

As mentioned before, the pipeline is self healing for the most part and does not
need your manual intervention anymore. Just push changes to your branch and see
those changes deploy.

> [!NOTE] If you make changes to environment variables used in your `mutato.yml`
or the core Mutato codebase itself, you have to deploy manually from your
terminal again.
