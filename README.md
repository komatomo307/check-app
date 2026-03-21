# check-app

CSVを1行ずつカード表示し、カード単位でいいね（ハート）とコメントを付けて、いいねした行のみを新しいCSVとして出力するアプリです。

## 対象データ

- 入力例: `事例解説.csv`
- 想定ヘッダー: `業界`, `事例名`, `その説明`, `専門用語の解説`

## 動作環境

- Node.js 18+
- npm

## セットアップ

```bash
cd /home/komatomo/AI/check-app
npm install
```

## 起動方法（開発）

```bash
npm run dev
```

起動後:

- フロントエンド: http://localhost:5173
- バックエンド: http://localhost:4000

## 使い方

1. 画面上部の「CSVファイルを選択」からCSVをアップロードします。
2. 1ページに1行（1カード）ずつ表示されます。
3. カード右上のハートボタンで、その行にいいねを付けます（1回のみ）。
4. カード下部のコメント欄でコメントを追加できます（複数可、削除可）。
5. 行ごとの「確認済み」にチェックを付けます。
6. 全行が確認済みになると「抽出CSVをダウンロード」が有効になります。
7. ダウンロードを実行すると、いいねされた行のみを含むCSVが保存されます。

## 出力CSV仕様

出力列:

- 元のCSV列
- `liked`（常に `true`）
- `comments`（JSON文字列）
- `checked_at`（確認時刻ISO文字列）

ファイル名:

- `<元ファイル名>_liked_rows_<YYYYMMDD_HHMMSS>.csv`

## よくあるトラブル

### ポート4000が使用中でサーバーが起動しない

`EADDRINUSE: address already in use :::4000` が出る場合、4000番ポートを使っているプロセスを停止してください。

```bash
lsof -ti :4000
kill <PID>
npm run dev
```

### 起動を停止したい

`npm run dev` 実行中のターミナルで `Ctrl + C` を押してください。

## 補足

- 開発ビルド: `npm run build`
- プレビュー: `npm run preview`

## GitHub Pagesで公開してスマホ利用（同一Wi-Fi不要）

このアプリは静的サイトとして公開できるため、GitHub Pagesにデプロイすればモバイル回線からも利用できます。

### 1. GitHubへpush

このリポジトリをGitHubの`main`ブランチへpushします。

### 2. Pagesを有効化

GitHubリポジトリ設定で以下を確認します。

- `Settings` → `Pages`
- `Build and deployment` の `Source` を `GitHub Actions` に設定

### 3. 自動デプロイ

`main` にpushすると、`.github/workflows/deploy-pages.yml` が実行され、`dist` がGitHub Pagesへ公開されます。

### 4. スマホから利用

公開URL（例）:

- `https://<your-user-name>.github.io/<your-repo-name>/`

このURLをスマートフォンで開けば、同一Wi-Fi不要で利用できます。

## デプロイ時の注意

- 現在の主要機能（CSV読込・いいね・コメント・CSV出力）はブラウザ内で完結するため、GitHub Pagesで問題なく動きます。
- `npm run dev` で使うローカルAPI（`http://localhost:4000`）は公開環境では使われません。
