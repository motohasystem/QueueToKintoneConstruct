// CDK v3 (TypeScript)
import { Stack, StackProps, Tags } from 'aws-cdk-lib';
import { Construct } from 'constructs';


// .envファイルから環境変数を読み込む
import * as dotenv from 'dotenv';
import { EventLoggerConstruct, kintoneAppAPIInformation } from './constructs/event-logger';
dotenv.config();


// このスタックは、SQSに送信したメッセージをkintoneアプリに登録するConstructsのサンプル実装です。
// SQSのメッセージを処理できなかった場合にDead Letter Queue (DLQ)に送信し、
// そのDLQからのメッセージをSlackに通知するLambda関数も含みます。
export class EventLoggerStack extends Stack {
    // kintoneアプリの情報を環境変数から取得
    appInfo: kintoneAppAPIInformation = {
        appLabel: process.env.APP_LABEL || '',
        appId: process.env.APP_ID || '',
        apiUrl: process.env.API_URL || '',
        apiToken: process.env.API_TOKEN || '',
        slackWebhookUrl: process.env.SLACK_WEBHOOK_URL || ''
    };

    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);

        new EventLoggerConstruct(this, 'EventLogger', {
            appInfo: this.appInfo
        });
    }

}
