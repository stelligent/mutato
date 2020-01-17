#!/usr/bin/env node
import * as cdk from '@aws-cdk/core';
import 'source-map-support/register';
import { MuStack } from '../lib/mu-stack';

const app = new cdk.App();
new MuStack(app, 'MuStack');
