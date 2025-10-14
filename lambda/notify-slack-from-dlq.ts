import { SQSEvent } from 'aws-lambda';

const webhookUrl = process.env.SLACK_WEBHOOK_URL!;

export const handler = async (event: SQSEvent): Promise<void> => {
    for (const record of event.Records) {
        const body = record.body;

        const slackMessage = {
            text: `📦 *DLQにメッセージが入りました*\n\`\`\`\n${body}\n\`\`\``,
        };

        try {
            const fetch = (await import('node-fetch')).default;
            const response = await fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(slackMessage),
            });

            if (!response.ok) {
                console.error('Slack通知失敗:', await response.text());
            }
        } catch (error) {
            console.error('Slack通知中にエラー:', error);
        }
    }
};
