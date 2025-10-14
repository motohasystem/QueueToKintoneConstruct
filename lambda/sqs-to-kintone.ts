import { SQSEvent } from 'aws-lambda';

const kintoneUrl = process.env.KINTONE_API_URL!;
const apiToken = process.env.KINTONE_API_TOKEN!;
const kintoneAppId = process.env.KINTONE_APP_ID; // KintoneのアプリIDを指定

// AWSのAttributeValueを表現した型
type AttributeValue = {
    S?: string;
    N?: number;
    BOOL?: boolean;
    SS?: string[];
    L?: any;
    M?: Record<string, AttributeValue>;
};

export const handler = async (event: SQSEvent): Promise<void> => {
    console.log('Received SQS event:', JSON.stringify(event, null, 2));

    // kintoneに送信するレコードの配列
    // ここでは一度に複数のレコードを送信することを想定しています
    const kintoneRecords = [];

    for (const record of event.Records) {
        const body = JSON.parse(record.body);

        console.log({ body })
        console.log({ record })

        // 以下の形で渡ってくるので、kintoneのレコード形式に変換する
        // body: {
        //     string_field_01: { S: 'ふたつめ' },
        //     string_field_02: { S: 'second' },
        //     id: { S: '125' }
        // }

        // key : {
        //     "value": value
        // }
        // というスタイルにする

        const fields = Object.entries(body).reduce<Record<string, { value: AttributeValue }>>((acc, [key, value]) => {
            const v = value as AttributeValue;
            acc[key] = { value: v.M ? JSON.stringify(v.M) : (v.S ?? v.N ?? v.BOOL ?? v.SS ?? v.L) };
            return acc;
        }, {});

        // kintoneのレコードを配列に追加
        kintoneRecords.push(fields);
    }

    // DLQテスト用の例外
    // 環境変数 THROW_DLQ_ERROR が true の場合、意図的にエラーを投げる
    if (process.env.THROW_DLQ_ERROR === 'true') {
        console.error('Throwing error to trigger DLQ');
        throw new Error('This is a test error to trigger the DLQ');
    }

    // kintoneに送るデータ形式を整形（例：record形式）
    const kintoneData = {
        app: kintoneAppId,
        records: kintoneRecords,
    };

    console.log({ kintoneData });
    console.log('Posting to Kintone:', JSON.stringify(kintoneData, null, 2));

    try {
        const fetch = (await import('node-fetch')).default;
        const res = await fetch(kintoneUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Cybozu-API-Token': apiToken,
            },
            body: JSON.stringify(kintoneData),
        });

        if (!res.ok) {
            console.error('Failed to POST to Kintone:', await res.text());
        } else {
            console.log('Successfully posted to Kintone');
        }
    } catch (err) {
        console.error('Error posting to Kintone:', err);
    }
};
