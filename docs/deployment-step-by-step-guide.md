# Pattern 2 無料デプロイ実行ガイド

## 概要
Render + Supabase + Netlify の組み合わせで無料デプロイを実行します。
**月間コスト**: 2ヶ月無料後 $6/月、2年間総額 $132

## 前提条件
- [x] PostgreSQLバックエンド変換完了
- [ ] Githubアカウント
- [ ] Google Cloud Console（OAuth設定済み）

---

## ステップ1: Supabase PostgreSQLデータベース作成

### 1.1 Supabaseアカウント作成
1. https://supabase.com にアクセス
2. "Start your project" をクリック
3. GitHubアカウントでサインアップ

### 1.2 新しいプロジェクト作成
1. "New project" をクリック
2. 設定項目：
   - **Organization**: 自動選択
   - **Name**: `splitmate-production`
   - **Database Password**: 強力なパスワードを生成（メモ必須）
   - **Region**: Northeast Asia (Tokyo)
   - **Pricing Plan**: Free tier
3. "Create new project" をクリック（2-3分待機）

### 1.3 データベース接続情報取得
1. プロジェクトダッシュボード → Settings → Database
2. "Connection string" の "URI" タブから接続文字列をコピー
3. パスワード部分（`[YOUR-PASSWORD]`）を実際のパスワードに置換
```
postgresql://postgres:[YOUR-PASSWORD]@db.xxx.supabase.co:5432/postgres
```

### 1.4 データベーススキーマ作成
1. Supabase Dashboard → SQL Editor
2. `backend/src/database/postgres-schema.sql` の内容をコピー・ペースト
3. "RUN" をクリックしてスキーマ作成

---

## ステップ2: Render バックエンドデプロイ

### 2.1 Renderアカウント作成
1. https://render.com にアクセス  
2. GitHubアカウントでサインアップ

### 2.2 GitHubリポジトリ接続
1. Render Dashboard → "New +" → "Web Service"
2. "Connect GitHub" → リポジトリを選択
3. Branch: `feature/issue-47-free-deployment-environments`

### 2.3 バックエンドサービス設定
```yaml
Name: splitmate-backend
Runtime: Node
Build Command: cd backend && npm ci && npm run build
Start Command: cd backend && npm start
```

### 2.4 環境変数設定
Render Dashboard → Service → Environment で以下を設定：

```bash
# 必須環境変数
NODE_ENV=production
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.xxx.supabase.co:5432/postgres

# Google OAuth設定（Google Cloud Consoleから取得）
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# セッション
SESSION_SECRET=your-super-secret-session-key

# CORS設定  
FRONTEND_URL=https://splitmate-frontend.netlify.app
BACKEND_URL=https://splitmate-backend.onrender.com
```

### 2.5 デプロイ実行
1. "Create Web Service" をクリック
2. デプロイ完了まで待機（5-10分）
3. ヘルスチェック確認: `https://your-service.onrender.com/health`

---

## ステップ3: Netlify フロントエンドデプロイ

### 3.1 Netlifyアカウント作成
1. https://netlify.com にアクセス
2. GitHubアカウントでサインアップ

### 3.2 新しいサイト作成
1. "New site from Git" をクリック
2. GitHub → リポジトリ選択
3. Branch: `feature/issue-47-free-deployment-environments`

### 3.3 ビルド設定
```yaml
Base directory: frontend
Build command: npm ci && npm run build  
Publish directory: frontend/dist
```

### 3.4 環境変数設定
Site Settings → Environment variables で設定：

```bash
# バックエンドAPI接続
VITE_BACKEND_URL=https://splitmate-backend.onrender.com

# Node.js バージョン
NODE_VERSION=22
```

### 3.5 デプロイ実行
1. "Deploy site" をクリック  
2. デプロイ完了まで待機（3-5分）
3. サイトURLを確認・テスト

---

## ステップ4: 統合テスト

### 4.1 バックエンドAPI確認
```bash
# ヘルスチェック
curl https://your-backend.onrender.com/health

# データベース接続確認
curl https://your-backend.onrender.com/api/allocation-ratio
```

### 4.2 フロントエンド確認
1. Netlifyサイトにアクセス
2. Google OAuth認証をテスト
3. 費用登録・表示機能をテスト

### 4.3 CORS設定確認
- フロントエンド→バックエンドAPI通信
- Google OAuth認証フロー
- セッション維持確認

---

## ステップ5: 本番運用設定

### 5.1 カスタムドメイン設定（オプション）
- Netlify: Site Settings → Domain management
- Render: Service → Settings → Custom Domains

### 5.2 SSL/TLS証明書
- 自動設定（Let's Encrypt）を確認

### 5.3 環境監視
- Render: デプロイログ・アプリケーションログ確認
- Supabase: データベースメトリクス確認
- Netlify: ビルドログ・フォーム送信確認

---

## トラブルシューティング

### バックエンドが起動しない
1. Renderのログを確認: Dashboard → Service → Logs
2. 環境変数の設定ミスをチェック
3. データベース接続文字列を再確認

### フロントエンドからAPIにアクセスできない
1. CORS設定確認（FRONTEND_URL、BACKEND_URL）
2. 環境変数 `VITE_BACKEND_URL` を確認
3. Network タブでAPIリクエストをデバッグ

### Google OAuth認証が失敗する
1. Google Cloud Console でリダイレクトURI確認:
   - `https://your-backend.onrender.com/auth/google/callback`
2. 認証情報（Client ID、Secret）を再確認

---

## 想定コスト

| サービス | プラン | 月額 | 制限 |
|---------|--------|------|------|
| Render | Free | $0 (2ヶ月) | 750時間/月、スリープあり |
| Supabase | Free | $0 | 500MB DB、50万リクエスト |
| Netlify | Free | $0 | 100GB帯域、300分ビルド |
| **合計** | **$0** → **$6/月** | **2年間: $132** |

---

## 次のステップ
- [ ] データ移行実行
- [ ] 監視・アラート設定
- [ ] バックアップ戦略策定
- [ ] 本番ドメイン設定 
