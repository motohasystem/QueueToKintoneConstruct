import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';

const sqsClient = new SQSClient({});
const queueUrl = process.env.QUEUE_URL!;

interface LambdaFunctionUrlEvent {
    queryStringParameters?: {
        count?: string;
        field1?: string;
        field2?: string;
    };
}

export const handler = async (event: LambdaFunctionUrlEvent): Promise<any> => {
    console.log('Received event:', JSON.stringify(event, null, 2));

    // クエリパラメータから送信するメッセージ数を取得（デフォルトは1）
    const count = parseInt(event.queryStringParameters?.count || '1', 10);
    const field1Value = event.queryStringParameters?.field1 || 'テストデータ';
    const field2Value = event.queryStringParameters?.field2 || 'test data';

    const results = [];

    // 指定された数だけメッセージを送信
    for (let i = 0; i < count; i++) {
        // DynamoDB AttributeValue形式でテストメッセージを作成
        const testMessage = {
            id: { S: `test-${Date.now()}-${i}` },
            timestamp: { S: new Date().toISOString() },
            string_field_01: { S: `${field1Value} ${i + 1}` },
            string_field_02: { S: `${field2Value} ${i + 1}` }
        };

        try {
            const command = new SendMessageCommand({
                QueueUrl: queueUrl,
                MessageBody: JSON.stringify(testMessage),
            });

            const response = await sqsClient.send(command);
            console.log(`Message ${i + 1} sent successfully:`, response.MessageId);

            results.push({
                index: i + 1,
                messageId: response.MessageId,
                status: 'success'
            });
        } catch (error) {
            console.error(`Failed to send message ${i + 1}:`, error);
            results.push({
                index: i + 1,
                error: error instanceof Error ? error.message : 'Unknown error',
                status: 'failed'
            });
        }
    }

    const successCount = results.filter(r => r.status === 'success').length;
    const failedCount = results.filter(r => r.status === 'failed').length;

    return {
        statusCode: 200,
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            message: `Sent ${successCount} message(s) to SQS`,
            failed: failedCount,
            total: count,
            queueUrl: queueUrl,
            results: results,
        }, null, 2),
    };
};
