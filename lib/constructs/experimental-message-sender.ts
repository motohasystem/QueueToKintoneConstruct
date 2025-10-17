/**
 * Experimental SQS Message Sender Construct
 * テスト用にSQSキューにメッセージを送信するLambda関数を提供する
 */

import { Construct } from 'constructs';
import { Queue } from 'aws-cdk-lib/aws-sqs';
import { Duration, CfnOutput } from 'aws-cdk-lib';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { FunctionUrl, FunctionUrlAuthType } from 'aws-cdk-lib/aws-lambda';
import path from 'path';

interface ExperimentalSqsMessageSenderConstructProps {
    queue: Queue;
}

export class ExperimentalSqsMessageSenderConstruct extends Construct {
    public readonly lambda: NodejsFunction;
    public readonly functionUrl: FunctionUrl;

    constructor(scope: Construct, id: string, props: ExperimentalSqsMessageSenderConstructProps) {
        super(scope, id);

        // Lambda関数を作成してSQSにメッセージを送信
        this.lambda = new NodejsFunction(this, 'SendTestMessageHandler', {
            entry: path.join(__dirname, '../../lambda/send-test-message.ts'),
            runtime: Runtime.NODEJS_22_X,
            timeout: Duration.seconds(30),
            environment: {
                QUEUE_URL: props.queue.queueUrl,
            },
        });

        // SQSキューへの送信権限を付与
        props.queue.grantSendMessages(this.lambda);

        // テスト用にLambda Function URLを作成（認証なし）
        this.functionUrl = this.lambda.addFunctionUrl({
            authType: FunctionUrlAuthType.NONE,
        });

        // Function URLを出力
        new CfnOutput(this, 'TestMessageSenderUrl', {
            value: this.functionUrl.url,
            description: 'URL to send test messages to SQS',
            exportName: `${id}-FunctionUrl`,
        });
    }
}
