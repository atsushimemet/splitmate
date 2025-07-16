# SplitMate プロジェクト再開ガイド

## 📋 概要

このドキュメントは、SplitMateプロジェクトを一時停止した後に再開する際の手順書です。
プロジェクトの全体像、技術スタック、インフラ構成、および再開手順を包括的に説明します。

---

## 🏗️ プロジェクト概要

### SplitMateとは
- **目的**: 夫婦・カップルでの支出を管理・分割するWebアプリケーション
- **主な機能**: 
  - 支出の記録・管理
  - 自動割り勘計算
  - 精算状況の追跡
  - Google OAuth認証
  - レスポンシブUI

### 技術スタック

#### フロントエンド
- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **HTTP Client**: Axios
- **認証**: Google OAuth 2.0

#### バックエンド  
- **Runtime**: Node.js 22.17.0
- **Framework**: Express.js + TypeScript
- **Database**: MySQL 8.0
- **ORM**: なし（生SQLクエリ）
- **認証**: Passport.js (Google Strategy)
- **セッション管理**: express-session

#### インフラストラクチャ
- **Cloud Provider**: AWS (ap-northeast-1)
- **IaC**: Terraform
- **Container**: Docker + Docker Compose
- **Orchestration**: AWS ECS Fargate
- **Database**: AWS RDS MySQL
- **Load Balancer**: AWS Application Load Balancer
- **Container Registry**: AWS ECR

---

## 🏛️ AWSアーキテクチャ

### ネットワーク構成
```
Internet Gateway
        ↓
Application Load Balancer (Public)
        ↓
ECS Fargate Tasks (Public Subnets)
├── Frontend Service (React)
└── Backend Service (Express)
        ↓
RDS MySQL (Private Subnets)
```

### 主要コンポーネント

| コンポーネント | 名前 | 仕様 |
|--------------|------|------|
| **VPC** | `splitmate-vpc` | CIDR: 10.0.0.0/16 |
| **Subnets** | Public: 1a, 1c<br>Private: 1a, 1c | 各 /24 |
| **ECS Cluster** | `splitmate-cluster` | Fargate |
| **Backend Service** | `splitmate-backend-service` | 0.25 vCPU, 0.5GB RAM |
| **Frontend Service** | `splitmate-frontend-service` | 0.25 vCPU, 0.5GB RAM |
| **RDS** | `splitmate-mysql` | db.t3.micro, 20GB |
| **ALB** | `splitmate-alb` | Internet-facing |
| **ECR** | `splitmate-backend`<br>`splitmate-frontend` | Private repositories |

### ルーティング設定
- `/api/*` → Backend Service
- `/auth/google*` → Backend Service  
- `/auth/status` → Backend Service
- `/auth/logout` → Backend Service
- `/health` → Backend Service
- `/*` → Frontend Service (Default)

---

## 📁 プロジェクト構造

```
splitmate/
├── backend/                    # バックエンドアプリケーション
│   ├── src/
│   │   ├── controllers/        # APIコントローラー
│   │   ├── database/          # DB接続・マイグレーション
│   │   ├── routes/            # ルート定義
│   │   ├── services/          # ビジネスロジック
│   │   └── types/             # 型定義
│   ├── Dockerfile.dev         # 開発用Docker設定
│   ├── Dockerfile.prod        # 本番用Docker設定
│   └── package.json
├── frontend/                   # フロントエンドアプリケーション
│   ├── src/
│   │   ├── components/        # Reactコンポーネント
│   │   ├── contexts/          # React Context
│   │   ├── hooks/             # カスタムフック
│   │   ├── pages/             # ページコンポーネント
│   │   └── services/          # API通信
│   ├── Dockerfile.dev         # 開発用Docker設定
│   ├── Dockerfile.prod        # 本番用Docker設定
│   └── package.json
├── infra/                      # インフラストラクチャ
│   └── terraform/
│       ├── main.tf            # メインインフラ定義
│       ├── outputs.tf         # 出力値定義
│       └── terraform.tfvars   # 変数設定（要作成）
├── scripts/                    # 管理スクリプト
│   ├── create-aws-resources.sh        # AWS リソース作成
│   ├── delete-aws-resources.sh        # AWS リソース削除
│   ├── delete-aws-resources-fixed.sh  # 直接削除版
│   ├── start-aws-resources.sh         # リソース開始
│   └── stop-aws-resources.sh          # リソース停止
├── docs/                       # ドキュメント
└── docker-compose.dev.yml     # ローカル開発環境
```

---

## 🚀 プロジェクト再開手順

### 前提条件チェック

1. **開発環境の確認**
```bash
# Node.js バージョン確認（v22.17.0推奨）
node --version

# Docker確認
docker --version
docker compose version

# Terraform確認  
terraform --version

# AWS CLI確認
aws --version
aws sts get-caller-identity
```

2. **必要ツールのインストール**
```bash
# Node.js (nvmを使用)
nvm install v22.17.0
nvm use v22.17.0

# Terraform
brew install terraform

# AWS CLI
brew install awscli
```

### ローカル開発環境の起動

```bash
# 1. プロジェクトクローン（必要に応じて）
git clone <repository-url>
cd splitmate

# 2. Node.jsバージョン設定
nvm use v22.17.0

# 3. ローカル開発環境起動
docker compose -f docker-compose.dev.yml up -d

# 4. ログ確認
docker compose -f docker-compose.dev.yml logs -f

# アクセス確認
# Frontend: http://localhost:3000
# Backend: http://localhost:3001
```

### AWSリソースの作成・起動

#### 1. AWS認証設定
```bash
aws configure
# Access Key ID: [Your Access Key]
# Secret Access Key: [Your Secret Key]  
# Default region: ap-northeast-1
# Default output format: json
```

#### 2. Terraform変数設定
```bash
# サンプルファイルをコピー
cp infra/terraform/terraform.tfvars.example infra/terraform/terraform.tfvars

# 必要な値を設定
vim infra/terraform/terraform.tfvars
```

**設定が必要な値:**
```hcl
google_client_id     = "your-google-client-id.apps.googleusercontent.com"
google_client_secret = "your-google-client-secret"
session_secret       = "your-secure-session-secret"
```

#### 3. AWSリソース作成
```bash
# 一括作成実行
./scripts/create-aws-resources.sh

# 実行時間: 約10-15分
# 作成されるリソース: VPC, ECS, RDS, ALB, ECR等
```

### アプリケーションのデプロイ

#### 1. ECRログイン
```bash
# ECRログイン認証取得
aws ecr get-login-password --region ap-northeast-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.ap-northeast-1.amazonaws.com
```

#### 2. バックエンドのビルド・デプロイ
```bash
cd backend

# Docker イメージビルド
docker build -f Dockerfile.prod -t splitmate-backend .

# ECRタグ付け
docker tag splitmate-backend:latest <account-id>.dkr.ecr.ap-northeast-1.amazonaws.com/splitmate-backend:latest

# ECRプッシュ
docker push <account-id>.dkr.ecr.ap-northeast-1.amazonaws.com/splitmate-backend:latest

cd ..
```

#### 3. フロントエンドのビルド・デプロイ
```bash
cd frontend

# Docker イメージビルド（ALB URLを環境変数に設定）
docker build -f Dockerfile.prod --build-arg VITE_API_URL=http://<alb-dns-name> -t splitmate-frontend .

# ECRタグ付け
docker tag splitmate-frontend:latest <account-id>.dkr.ecr.ap-northeast-1.amazonaws.com/splitmate-frontend:latest

# ECRプッシュ  
docker push <account-id>.dkr.ecr.ap-northeast-1.amazonaws.com/splitmate-frontend:latest

cd ..
```

#### 4. ECSサービス更新
```bash
# サービス強制更新（新しいイメージを取得）
aws ecs update-service --cluster splitmate-cluster --service splitmate-backend-service --force-new-deployment --region ap-northeast-1

aws ecs update-service --cluster splitmate-cluster --service splitmate-frontend-service --force-new-deployment --region ap-northeast-1
```

#### 5. データベース初期化
```bash
# RDSエンドポイント確認
aws rds describe-db-instances --db-instance-identifier splitmate-mysql --region ap-northeast-1 --query 'DBInstances[0].Endpoint.Address' --output text

# データベースマイグレーション実行（必要に応じて）
# Backend container内でマイグレーションスクリプト実行
```

---

## 📋 運用管理

### リソース状態確認
```bash
# ECS サービス状態
aws ecs describe-services --cluster splitmate-cluster --services splitmate-backend-service splitmate-frontend-service --region ap-northeast-1

# RDS 状態  
aws rds describe-db-instances --db-instance-identifier splitmate-mysql --region ap-northeast-1

# ALB 状態
aws elbv2 describe-load-balancers --names splitmate-alb --region ap-northeast-1
```

### リソース停止・開始
```bash
# 一時停止（コスト削減）
./scripts/stop-aws-resources.sh

# 再開
./scripts/start-aws-resources.sh
```

### ログ確認
```bash
# ECS ログ確認
aws logs describe-log-groups --log-group-name-prefix "/ecs/splitmate" --region ap-northeast-1

# 特定期間のログ取得
aws logs get-log-events --log-group-name "/ecs/splitmate-backend" --log-stream-name "<stream-name>" --region ap-northeast-1
```

---

## 💰 コスト管理

### 主要な料金発生リソース

| リソース | 月額概算 | 削減方法 |
|---------|---------|----------|
| RDS MySQL (db.t3.micro) | $12-15 | 停止スクリプト使用 |
| NAT Gateway | $32 | 不要時は削除 |
| ECS Fargate | $8-12 | desired count = 0 |
| ALB | $16 | 不要時は削除 |
| **合計** | **$68-75** | **停止時: $0** |

### コスト削減手順
```bash
# 日常的なコスト削減
./scripts/stop-aws-resources.sh

# 長期間不使用時
./scripts/delete-aws-resources.sh
```

---

## 🔧 トラブルシューティング

### よくある問題と解決方法

#### 1. AWS CLIコマンドエラー
```bash
# 問題: aws コマンドでhead/catエラー
# 解決: クリーンな環境でコマンド実行
env -i /bin/bash -c 'export AWS_PAGER="" && /usr/local/bin/aws <command>'
```

#### 2. ECSサービスが起動しない
```bash
# ECS タスク定義確認
aws ecs describe-task-definition --task-definition splitmate-backend --region ap-northeast-1

# ECS サービスイベント確認
aws ecs describe-services --cluster splitmate-cluster --services splitmate-backend-service --region ap-northeast-1
```

#### 3. RDS接続エラー
```bash
# セキュリティグループ確認
aws ec2 describe-security-groups --group-names "splitmate-db-sg" --region ap-northeast-1

# RDS エンドポイント確認
aws rds describe-db-instances --db-instance-identifier splitmate-mysql --region ap-northeast-1
```

#### 4. Docker build エラー
```bash
# Node.js バージョン確認
nvm use v22.17.0

# キャッシュクリア
docker system prune -a
```

### ログ確認コマンド
```bash
# ローカル開発環境
docker compose -f docker-compose.dev.yml logs <service-name>

# AWS ECS
aws logs get-log-events --log-group-name "/ecs/splitmate-backend" --log-stream-name "<stream>" --region ap-northeast-1
```

---

## 🔗 重要なリンク・情報

### AWS コンソール
- **リージョン**: ap-northeast-1 (東京)
- **ECS**: https://ap-northeast-1.console.aws.amazon.com/ecs/
- **RDS**: https://ap-northeast-1.console.aws.amazon.com/rds/
- **EC2** (VPC/ALB): https://ap-northeast-1.console.aws.amazon.com/ec2/

### 設定ファイル
```bash
# Terraform設定
infra/terraform/terraform.tfvars

# Docker Compose設定  
docker-compose.dev.yml

# 環境変数（本番）
# Backend: ECS Task Definition内で定義
# Frontend: Dockerfile.prod内のARG設定
```

### Google OAuth設定
- **Google Cloud Console**: https://console.cloud.google.com/
- **認証設定**: APIs & Services → Credentials
- **必要なリダイレクトURI**:
  - 開発: `http://localhost:3001/auth/google/callback`
  - 本番: `http://<alb-dns-name>/auth/google/callback`

---

## 📚 関連ドキュメント

- [AWS Resource Bulk Management](aws-resource-bulk-management.md) - 詳細なスクリプト使用方法
- [AWS Resource Management Checklist](aws-resource-management-checklist.md) - マネジメントコンソールでの確認手順
- [Deployment Setup Guide](deployment-setup-guide.md) - デプロイメント詳細手順
- [Development Process](development-process.md) - 開発プロセス

---

## ✅ 再開チェックリスト

### 開発環境準備
- [ ] Node.js v22.17.0 インストール・設定完了
- [ ] Docker, Docker Compose 動作確認
- [ ] Terraform インストール確認
- [ ] AWS CLI 認証設定完了

### AWS設定
- [ ] `terraform.tfvars` 設定完了
- [ ] Google OAuth設定確認
- [ ] AWSリソース作成完了
- [ ] ECRリポジトリ作成確認

### アプリケーション
- [ ] ローカル開発環境起動確認
- [ ] バックエンドデプロイ完了
- [ ] フロントエンドデプロイ完了
- [ ] データベースマイグレーション完了
- [ ] アプリケーション動作確認

### 運用
- [ ] ログ出力確認
- [ ] 監視設定（必要に応じて）
- [ ] バックアップ設定（必要に応じて）

---

## 🚨 重要な注意事項

1. **セキュリティ**:
   - `terraform.tfvars` はGitコミットしない
   - Google OAuth シークレットの管理に注意
   - IAM権限の最小化を実施

2. **コスト管理**:
   - 使用しない期間はリソース停止
   - 定期的な利用状況確認
   - AWS Budgets設定推奨

3. **データバックアップ**:
   - RDS自動バックアップは有効
   - 重要データの手動バックアップも検討

4. **スケーラビリティ**:
   - 現在の設定は小規模運用向け
   - 本格運用時はリソース設定の見直しが必要

---

**最終更新**: 2024年11月
**作成者**: 開発チーム
**次回レビュー**: プロジェクト再開時 
