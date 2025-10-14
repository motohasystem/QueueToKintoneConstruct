# Queue to Kintone Constructs

SQSキューからkintoneアプリへのデータ連携を行うAWS CDKプロジェクトです。SQSメッセージを最大100件までバッチ処理し、kintoneのREST APIを使ってレコードを一括登録します。

## 概要

このプロジェクトは以下の機能を提供します:

- **SQS Queue**: メッセージを受信し、Lambda関数で処理
- **Lambda関数 (sqs-to-kintone)**: SQSメッセージをkintoneアプリに登録
- **Dead Letter Queue (DLQ)**: 処理失敗時のメッセージを保持
- **Lambda関数 (notify-slack-from-dlq)**: DLQに入ったメッセージをSlackに通知

## 前提条件

- Node.js 22.x 以上
- AWS CLI (設定済み)
- AWS CDK CLI (`npm install -g aws-cdk`)
- kintoneアカウントとAPIトークン
- Slack Webhook URL (オプション)

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

`.env.example` ファイルをコピーして `.env` ファイルを作成し、必要な値を設定してください。

```bash
cp .env.example .env
```

#### 必須の環境変数

| 環境変数 | 説明 | 例 |
|---------|------|-----|
| `PROJECT_NAME` | プロジェクト名 | `KintanLab` |
| `COMPONENT_NAME` | コンポーネント名 | `QueueToKintone` |
| `STAGE_NAME` | 環境名 (dev, staging, prod など) | `dev` |
| `REGION` | AWSリージョン | `us-east-1` |
| `APP_LABEL` | kintoneアプリのラベル | `YourAppLabel` |
| `APP_ID` | kintoneアプリのID | `123` |
| `API_URL` | kintone REST APIのURL | `https://your-domain.cybozu.com/k/v1/records.json` |
| `API_TOKEN` | kintone APIトークン | `your_api_token` |
| `SLACK_WEBHOOK_URL` | Slack Webhook URL | `https://hooks.slack.com/services/...` |

#### オプションの環境変数

| 環境変数 | 説明 | デフォルト値 |
|---------|------|-------------|
| `THROW_DLQ_ERROR` | DLQテスト用 (trueで意図的にエラーを発生) | `false` |

### 3. TypeScriptのコンパイル

```bash
npm run build
```

### 4. CDKスタックのデプロイ

```bash
npx cdk deploy
```

初回デプロイ時は、AWS CDKのブートストラップが必要な場合があります:

```bash
npx cdk bootstrap
```

## 使い方

### SQSキューへのメッセージ送信

デプロイ後、CloudFormationの出力からSQSキューのURLを確認し、以下の形式でメッセージを送信してください:

```json
{
  "string_field_01": { "S": "値1" },
  "string_field_02": { "S": "値2" },
  "id": { "S": "123" }
}
```

AWS CLIを使用した送信例:

```bash
aws sqs send-message \
  --queue-url <QueueUrl> \
  --message-body '{"string_field_01":{"S":"テスト"},"id":{"S":"1"}}'
```

### DLQ通知のテスト

環境変数 `THROW_DLQ_ERROR=true` に設定すると、意図的にエラーを発生させてDLQの動作をテストできます。

## プロジェクト構成

```
.
├── bin/
│   └── dev.ts              # CDKアプリのエントリーポイント
├── lib/
│   ├── dev-stack.ts        # メインスタック定義
│   └── constructs/
│       └── queue-to-kintone.ts  # SQS→Kintone連携のConstruct
├── lambda/
│   ├── sqs-to-kintone.ts        # SQSメッセージ処理Lambda
│   └── notify-slack-from-dlq.ts # DLQ→Slack通知Lambda
├── package.json
├── tsconfig.json
├── cdk.json
└── README.md
```

## 開発コマンド

| コマンド | 説明 |
|---------|------|
| `npm run build` | TypeScriptをJavaScriptにコンパイル |
| `npm run watch` | ファイル変更を監視して自動コンパイル |
| `npm run test` | Jestでユニットテストを実行 |
| `npx cdk deploy` | スタックをAWSにデプロイ |
| `npx cdk diff` | デプロイ済みスタックと現在の状態を比較 |
| `npx cdk synth` | CloudFormationテンプレートを生成 |
| `npx cdk destroy` | スタックを削除 |

## アーキテクチャ

```
[データソース]
    ↓
[SQS Queue]
    ↓
[Lambda: sqs-to-kintone]
    ↓
[Kintone API]

[処理失敗時]
    ↓
[Dead Letter Queue]
    ↓
[Lambda: notify-slack-from-dlq]
    ↓
[Slack]
```

## 注意事項

- SQSメッセージは最大100件までバッチ処理されます
- DLQの保持期間は14日間です
- Lambda関数のタイムアウトは60秒に設定されています
- `.env` ファイルは `.gitignore` に含まれており、Gitにコミットされません

## ライセンス

このプロジェクトはMITライセンスの下で公開されています。
