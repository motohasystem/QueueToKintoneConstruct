/**
 * Event Logger Construct
 * 共通形式のイベントを受け取り、最大100件までまとめてkintoneに登録する
 */

import { Construct } from 'constructs'
import { Queue } from 'aws-cdk-lib/aws-sqs'
import { CfnOutput, Duration } from 'aws-cdk-lib'
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs'
import path from 'path'
import { Runtime } from 'aws-cdk-lib/aws-lambda'
import { SqsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources'


export interface kintoneAppAPIInformation {
    appLabel: string;
    appId: string;
    apiUrl: string;
    apiToken: string;
    slackWebhookUrl: string; // SlackのWebhook URL
}


interface QueueToKintoneConstructProps {
    appInfo: kintoneAppAPIInformation;
}

export class QueueToKintoneConstruct extends Construct {
    constructor(scope: Construct, id: string, props: QueueToKintoneConstructProps) {
        super(scope, id)

        // Dead Letter Queue
        const deadLetterQueue = new Queue(this, id + 'DLQ', {
            retentionPeriod: Duration.days(14),
        });

        // SQS Queue
        const queue = new Queue(this, id + 'Queue', {
            receiveMessageWaitTime: Duration.seconds(20),   // Long polling for SQS with 20 seconds
            visibilityTimeout: Duration.seconds(120),
            deadLetterQueue: {
                maxReceiveCount: 5,
                queue: deadLetterQueue,
            },
        });

        // DBとkintoneをSQSで接続する
        this.channelingDBtoKintone(id, queue, deadLetterQueue, props.appInfo);      // 寄付者情報テーブルの処理

        new CfnOutput(this, `${id}-QueueArn`, {
            value: queue.queueArn,
            description: 'The ARN of the SQS queue',
            exportName: `${id}-QueueArn`,
        });

        new CfnOutput(this, `${id}-QueueUrl`, {
            value: queue.queueUrl,
            description: 'The URL of the SQS queue',
            exportName: `${id}-QueueUrl`,
        });
    }

    // DynamoDBのストリームからSQSにメッセージを転送し、SQSからKintoneのREST APIを呼び出すLambda関数を設定する
    channelingDBtoKintone(
        id: string,
        queue: Queue,
        deadLetterQueue: Queue,
        appInfo: kintoneAppAPIInformation
    ) {
        const channelLabel = appInfo.appLabel;

        // Lambda to process messages from SQS and call Kintone REST API
        const sqsToKintoneLambda = new NodejsFunction(this, 'SqsToKintoneHandler' + channelLabel, {
            entry: path.join(__dirname, '../../lambda/sqs-to-kintone.ts'),
            runtime: Runtime.NODEJS_22_X,
            timeout: Duration.seconds(60), // 明示的に設定
            environment: {
                KINTONE_API_TOKEN: appInfo.apiToken,
                KINTONE_API_URL: appInfo.apiUrl,
                KINTONE_APP_ID: appInfo.appId,
                THROW_DLQ_ERROR: process.env.THROW_DLQ_ERROR || 'false', // DLQテスト用の環境変数
            },
        });
        queue.grantConsumeMessages(sqsToKintoneLambda);
        sqsToKintoneLambda.addEventSource(new SqsEventSource(queue, {
            batchSize: 100, // 一度に処理するメッセージ数
            maxBatchingWindow: Duration.seconds(20), // バッチ処理の最大待機時間
            reportBatchItemFailures: true, // バッチ内の失敗したアイテムを報告
        }));

        // Lambda to notify Slack when DLQ receives messages
        const notifySlackLambda = new NodejsFunction(this, 'NotifySlackFromDlq' + channelLabel, {
            entry: path.join(__dirname, '../../lambda/notify-slack-from-dlq.ts'),
            runtime: Runtime.NODEJS_22_X,
            environment: {
                SLACK_WEBHOOK_URL: appInfo.slackWebhookUrl
            },
        });
        deadLetterQueue.grantConsumeMessages(notifySlackLambda);
        notifySlackLambda.addEventSource(new SqsEventSource(deadLetterQueue));
    }
}
