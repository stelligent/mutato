#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { MuStack } from '../lib/mu-stack';

const app = new cdk.App();
new MuStack(app, 'MuStack');
