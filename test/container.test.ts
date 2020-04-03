import * as cdkAssert from '@aws-cdk/assert';
import * as cdk from '@aws-cdk/core';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { Container } from '../lib/resources/container';
import { config } from '../lib';

chai.use(chaiAsPromised);

describe('Container Construct Tests', () => {
  describe('DockerHub Tests', () => {
    it('should not create an ECR repository when a tag is given', () => {
      const app = new cdk.App();
      const stack = new cdk.Stack(app, 'MyTestStack');
      const construct = new Container(stack, 'MyTestContainer', {
        file: 'Dockerfile',
        uri: 'stelligent/mutato',
      });
      cdkAssert
        .expect(stack)
        .notTo(cdkAssert.haveResource('AWS::ECR::Repository'));
      chai.assert.equal(construct.props.uri, 'stelligent/mutato');
    });

    it('should ba able to generate a build command with a tag', () => {
      const app = new cdk.App();
      const stack = new cdk.Stack(app, 'MyTestStack');
      const construct = new Container(stack, 'MyTestContainer', {
        file: 'Dockerfile',
        uri: 'stelligent/mutato',
      });
      chai.assert.equal(construct.props.uri, 'stelligent/mutato');
      chai
        .expect(construct.buildCommand)
        .to.be.equal(
          `docker build  -t stelligent/mutato -t stelligent/mutato:$mutato_opts__git__commit -f Dockerfile .`,
        );
      const construct2 = new Container(stack, 'MyTestContainer2', {
        buildArgs: {
          key1: 'val1',
          key2: 'val2',
        },
        file: 'Dockerfile2',
        context: 'Context2',
        uri: 'stelligent/mutato',
      });
      chai
        .expect(construct2.buildCommand)
        .to.be.equal(
          `docker build --build-arg key1="val1" --build-arg key2="val2" -t stelligent/mutato -t stelligent/mutato:$mutato_opts__git__commit -f Dockerfile2 Context2`,
        );
    });

    it('should ba able to generate a push command without a tag', () => {
      const app = new cdk.App();
      const stack = new cdk.Stack(app, 'MyTestStack');
      const construct = new Container(stack, 'MyTestContainer', {
        file: 'Dockerfile',
        uri: 'stelligent/mutato',
      });
      chai.assert.equal(construct.props.uri, 'stelligent/mutato');
      const uri = construct.getImageUri();
      chai
        .expect(construct.pushCommand)
        .to.be.equal(
          `docker push ${uri} && docker push ${uri}:$mutato_opts__git__commit`,
        );
    });
  });

  describe('ECR Tests', () => {
    it('should create an ECR repository when no tag is given', () => {
      const app = new cdk.App();
      const stack = new cdk.Stack(app, 'MyTestStack');
      new Container(stack, 'MyTestContainer', {
        file: 'Dockerfile',
      });
      cdkAssert
        .expect(stack)
        .to(cdkAssert.haveResource('AWS::ECR::Repository'));
    });

    it('should ba able to generate a build command without a tag', () => {
      const app = new cdk.App();
      const stack = new cdk.Stack(app, 'MyTestStack');
      const construct = new Container(stack, 'MyTestContainer', {
        file: 'Dockerfile',
      });

      const uri1 = construct.getImageUri();
      chai
        .expect(construct.buildCommand)
        .to.be.equal(
          `docker build  -t ${uri1} -t ${uri1}:$mutato_opts__git__commit -f Dockerfile .`,
        );
      const construct2 = new Container(stack, 'MyTestContainer2', {
        buildArgs: {
          key1: 'val1',
          key2: 'val2',
        },
        file: 'Dockerfile2',
        context: 'Context2',
      });
      const uri2 = construct2.getImageUri();
      chai
        .expect(construct2.buildCommand)
        .to.be.equal(
          `docker build --build-arg key1="val1" --build-arg key2="val2" -t ${uri2} -t ${uri2}:$mutato_opts__git__commit -f Dockerfile2 Context2`,
        );
    });

    it('should ba able to generate a push command without a tag', () => {
      const app = new cdk.App();
      const stack = new cdk.Stack(app, 'MyTestStack');
      const construct = new Container(stack, 'MyTestContainer', {
        file: 'Dockerfile',
      });

      const uri = construct.getImageUri();
      chai
        .expect(construct.pushCommand)
        .to.be.equal(
          `docker push ${uri} && docker push ${uri}:$mutato_opts__git__commit`,
        );
    });
  });
});
