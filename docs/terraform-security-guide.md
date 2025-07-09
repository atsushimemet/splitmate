# 🔒 Terraform Security Guide

このドキュメントでは、SplitMateプロジェクトにおけるTerraformの安全な使用方法について説明します。

## ⚠️ 重要: 機密データの取り扱い

**Terraform state ファイルには機密情報が含まれます。絶対にGitにコミットしないでください！**

### 🚫 コミットしてはいけないファイル

以下のファイルには認証情報や機密データが含まれるため、**絶対に**バージョン管理に含めてはいけません：

```
# Terraform State Files (CRITICAL)
*.tfstate
*.tfstate.backup
terraform.tfstate.*

# Terraform Variables (CRITICAL)  
*.tfvars
terraform.tfvars

# その他の機密ファイル
*.pem
*.key
gcp-key.json
aws-credentials.json
```

## 🛡️ セキュリティ対策

### 1. .gitignore設定

プロジェクトの`.gitignore`には以下の設定が含まれています：

```gitignore
# Terraform state files (CONTAINS SECRETS - NEVER COMMIT)
*.tfstate
*.tfstate.*
*.tfstate.backup
**/terraform.tfstate
**/terraform.tfstate.*
**/terraform.tfstate.backup

# Terraform variables with secrets (CONTAINS SECRETS - NEVER COMMIT)
terraform.tfvars
*.tfvars
**/terraform.tfvars
**/*.tfvars
```

### 2. Pre-commitフック

機密ファイルの誤コミットを防ぐため、pre-commitフックを設定してください：

```bash
# フックをインストール
./scripts/install-hooks.sh
```

フックは以下をチェックします：
- Terraform state ファイル
- .tfvars ファイル  
- SSH鍵
- 認証情報ファイル
- ファイル内容の機密データパターン

### 3. 環境変数の設定

機密情報は環境変数または `terraform.tfvars` ファイルで管理してください：

```bash
# terraform.tfvars.example をコピー
cp infra/terraform/terraform.tfvars.example infra/terraform/terraform.tfvars

# 実際の値を設定
vim infra/terraform/terraform.tfvars
```

## 🚀 セットアップ手順

### 1. 初回セットアップ

```bash
# リポジトリをクローン
git clone <repository-url>
cd splitmate

# Git hooksをインストール
./scripts/install-hooks.sh

# Terraform変数ファイルを作成
cp infra/terraform/terraform.tfvars.example infra/terraform/terraform.tfvars
```

### 2. Google OAuth設定

1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. プロジェクトを作成または選択
3. **APIs & Services > Credentials** に移動
4. **Create Credentials > OAuth 2.0 Client IDs** をクリック
5. 以下の設定を行う：
   - Application type: Web application
   - Authorized redirect URIs:
     - `http://localhost:3001/auth/google/callback` (開発環境)
     - `http://your-alb-domain/auth/google/callback` (本番環境)

6. 取得したClient IDとClient Secretを`terraform.tfvars`に設定：

```hcl
google_client_id     = "123456789-abcdefg.apps.googleusercontent.com"
google_client_secret = "GOCSPX-your-client-secret"
session_secret       = "your-secure-random-session-secret"
```

### 3. Terraform実行

```bash
cd infra/terraform

# 初期化
terraform init

# プランの確認
terraform plan

# 適用
terraform apply
```

## 🔍 トラブルシューティング

### Q: "Repository rule violations found" エラーが出る

**A:** GitHub Secret Scanningが機密データを検出しています。

```bash
# 問題のファイルを確認
git status

# 機密ファイルを削除
git rm --cached <sensitive-file>

# 変更をコミット
git commit -m "Remove sensitive files"
```

### Q: Terraform stateファイルが誤ってコミットされた

**A:** 以下の手順で履歴から削除してください：

```bash
# ファイルを追跡から除外
git rm --cached infra/terraform/terraform.tfstate*

# 履歴から完全に削除（注意：破壊的操作）
git filter-branch --force --index-filter \
  'git rm --cached --ignore-unmatch infra/terraform/terraform.tfstate*' \
  --prune-empty --tag-name-filter cat -- --all

# 強制プッシュ（チーム全体に影響があるため要注意）
git push --force-with-lease origin main
```

### Q: Pre-commitフックが動作しない

**A:** フックが正しくインストールされているか確認してください：

```bash
# フックの再インストール
./scripts/install-hooks.sh

# 実行権限の確認
ls -la .git/hooks/pre-commit

# 手動テスト
.git/hooks/pre-commit
```

## 📋 チェックリスト

新しい開発者向けのセットアップチェックリスト：

- [ ] リポジトリをクローン
- [ ] `./scripts/install-hooks.sh` を実行
- [ ] `terraform.tfvars.example` を `terraform.tfvars` にコピー
- [ ] Google OAuth認証情報を設定
- [ ] `terraform.tfvars` がgitignoreされていることを確認
- [ ] pre-commitフックのテスト（.tfvarsファイルの偽コミット）

## 🆘 緊急時の対応

### 機密データが漏洩した場合

1. **即座に認証情報を無効化**
   - Google Cloud Console でOAuth認証情報を削除
   - AWS認証情報がある場合は無効化

2. **履歴からの完全削除**
   - `git filter-branch` または `git filter-repo` を使用
   - すべてのブランチとタグから削除

3. **新しい認証情報を生成**
   - 新しいOAuth認証情報を作成
   - 新しいセッションシークレットを生成

4. **チーム全体への通知**
   - インシデントの報告
   - 新しい認証情報の共有（安全な方法で）

## 📚 参考資料

- [Terraform Security Best Practices](https://learn.hashicorp.com/tutorials/terraform/sensitive-variables)
- [GitHub Secret Scanning](https://docs.github.com/en/code-security/secret-scanning)
- [Google OAuth 2.0 Setup](https://developers.google.com/identity/protocols/oauth2)
- [Git Hooks Documentation](https://git-scm.com/book/en/v2/Customizing-Git-Git-Hooks) 
