#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { QueueToKintoneStack } from '../lib/dev-stack';
import * as dotenv from 'dotenv';

// .envファイルから環境変数を読み込む
dotenv.config();

const app = new cdk.App();

// 環境変数からスタック名を構築
const projectName = process.env.PROJECT_NAME || 'KintanLab';
const componentName = process.env.COMPONENT_NAME || 'QueueToKintone';
const stageName = process.env.STAGE_NAME || 'dev';

const stackName = `${projectName}-${stageName}-Stack`;

// 環境変数からリージョンを取得（デフォルトはus-east-1）
const region = process.env.REGION || 'us-east-1';

const stack = new QueueToKintoneStack(app, stackName, {
    env: { region: region } // 環境変数からリージョンを設定
});

// スタックのタグを設定
cdk.Tags.of(stack).add('Project', projectName);
cdk.Tags.of(stack).add('Component', componentName);
cdk.Tags.of(stack).add('Stage', stageName);

