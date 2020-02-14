#### Usage

Create the initial Mutato stack with:

```
aws cloudformation create-stack --stack-name mutato --template-body file://cloudformation/pipeline.yml --parameters ParameterKey=OauthToken,ParameterValue=XXX ParameterKey=GithubOwner,ParameterValue=gitUser ParameterKey=GithubRepo,ParameterValue=mutato ParameterKey=GithubBranch,ParameterValue=develop
```

**NOTE:** To interact with git, a deploy key should be associated with the project via the `mutato/ssh` SecretManager Secret.
