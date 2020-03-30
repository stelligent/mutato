# Extending Mutato in CDK

> [!WARNING] Advanced users only! If you do not know what you are doing and do
> not know how to work with CDK, you are at the wrong place. This page is for
> CDK users who wish to integrate and extend Mutato in their  CDK applications.

Mutato at its core is just a CDK application. You can use its constructs and
helpers in any CDK application. To get started:

```bash
$ npm install stelligent/mutato --save
```

And you can start using our constructs or helpers:

```TypeScript
import * as mutato from 'stelligent/mutato';
import * as sns from '@aws-cdk/aws-sns';

async function createCustomMutatoApp() {
  // mutato.App is a subclass of cdk.App
  const app = new mutato.App();
  await app.synthesizeFromFile('/path/to/mutato.yml');
  
  // here you have a functioning CDK app, you can use it to add more resources
  const customStack = new cdk.Stack(app, 'MuCustomStack', {
    description: 'example of a custom stack attached to a Mutato app',
  });

  // add a SNS topic into your custom stack
  const topic = new sns.Topic(customStack, 'MyTopic', {
    displayName: 'Customer subscription topic'
  });

  // if you wish to customize what mutato synthesizes, you can also use all the
  // CDK "escape hatches" or other mechanisms you know of here.
  // https://docs.aws.amazon.com/cdk/latest/guide/cfn_layer.html
}
```