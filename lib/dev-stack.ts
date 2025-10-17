// CDK v3 (TypeScript)
import { Stack, StackProps, Tags } from 'aws-cdk-lib';
import { Construct } from 'constructs';


// .envファイルから環境変数を読み込む
import * as dotenv from 'dotenv';
import { QueueToKintoneConstruct, kintoneAppAPIInformation } from './constructs/queue-to-kintone';
import { ExperimentalSqsMessageSenderConstruct } from './constructs/experimental-message-sender';
dotenv.config();


// このスタックは、SQSに送信したメッセージをkintoneアプリに登録するConstructsのサンプル実装です。
// SQSのメッセージを処理できなかった場合にDead Letter Queue (DLQ)に送信し、
// そのDLQからのメッセージをSlackに通知するLambda関数も含みます。
export class QueueToKintoneStack extends Stack {
    // kintoneアプリの情報を環境変数から取得
    appInfo: kintoneAppAPIInformation;

    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);

        // 環境変数のバリデーション
        this.validateEnvironmentVariables();

        const queueToKintoneConstruct = new QueueToKintoneConstruct(this, 'QueueToKintone', {
            appInfo: this.appInfo
        });

        // キューを登録するためのテスト用Lambda関数を持ったConstruct
        new ExperimentalSqsMessageSenderConstruct(this, 'SqsMessageSender', {
            queue: queueToKintoneConstruct.queue,
        });
    }

    private validateEnvironmentVariables() {
        const requiredEnvVars = [
            'APP_LABEL',
            'APP_ID',
            'API_URL',
            'API_TOKEN',
            'SLACK_WEBHOOK_URL'
        ];

        const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

        if (missingVars.length > 0) {
            throw new Error(
                `必須の環境変数が設定されていません: ${missingVars.join(', ')}\n` +
                `.env ファイルを作成し、必要な環境変数を設定してください。\n` +
                `詳細は .env.example ファイルを参照してください。`
            );
        }

        this.appInfo = {
            appLabel: process.env.APP_LABEL!,
            appId: process.env.APP_ID!,
            apiUrl: process.env.API_URL!,
            apiToken: process.env.API_TOKEN!,
            slackWebhookUrl: process.env.SLACK_WEBHOOK_URL!
        };
    }

}
