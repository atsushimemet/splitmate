# SplitMate クイックリファレンス

## 🚀 基本操作

### ローカル開発環境
```bash
# 開発環境起動
nvm use v22.17.0
docker compose -f docker-compose.dev.yml up -d

# 開発環境停止
docker compose -f docker-compose.dev.yml down

# ログ確認
docker compose -f docker-compose.dev.yml logs -f
```

### AWSリソース管理
```bash
# リソース作成（初回）
./scripts/create-aws-resources.sh

# リソース停止（コスト削減）
./scripts/stop-aws-resources.sh

# リソース開始（復旧）
./scripts/start-aws-resources.sh

# リソース削除（完全削除）
./scripts/delete-aws-resources.sh
```

### デプロイメント
```bash
# ECRログイン
aws ecr get-login-password --region ap-northeast-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.ap-northeast-1.amazonaws.com

# バックエンドデプロイ
cd backend
docker build -f Dockerfile.prod -t splitmate-backend .
docker tag splitmate-backend:latest <account-id>.dkr.ecr.ap-northeast-1.amazonaws.com/splitmate-backend:latest
docker push <account-id>.dkr.ecr.ap-northeast-1.amazonaws.com/splitmate-backend:latest

# フロントエンドデプロイ
cd frontend
docker build -f Dockerfile.prod --build-arg VITE_API_URL=http://<alb-dns-name> -t splitmate-frontend .
docker tag splitmate-frontend:latest <account-id>.dkr.ecr.ap-northeast-1.amazonaws.com/splitmate-frontend:latest
docker push <account-id>.dkr.ecr.ap-northeast-1.amazonaws.com/splitmate-frontend:latest

# ECSサービス更新
aws ecs update-service --cluster splitmate-cluster --service splitmate-backend-service --force-new-deployment --region ap-northeast-1
aws ecs update-service --cluster splitmate-cluster --service splitmate-frontend-service --force-new-deployment --region ap-northeast-1
```

## 🔍 確認コマンド

### リソース状態確認
```bash
# ECS確認
aws ecs describe-services --cluster splitmate-cluster --services splitmate-backend-service splitmate-frontend-service --region ap-northeast-1

# RDS確認
aws rds describe-db-instances --db-instance-identifier splitmate-mysql --region ap-northeast-1

# ALB確認
aws elbv2 describe-load-balancers --names splitmate-alb --region ap-northeast-1
```

### ログ確認
```bash
# ECSログ確認
aws logs describe-log-groups --log-group-name-prefix "/ecs/splitmate" --region ap-northeast-1

# 直近のログ取得
aws logs get-log-events --log-group-name "/ecs/splitmate-backend" --log-stream-name "<stream>" --region ap-northeast-1
```

## ⚠️ 緊急時

### AWS CLIエラーの場合
```bash
# クリーンな環境でコマンド実行
env -i /bin/bash -c 'export AWS_PAGER="" && /usr/local/bin/aws <command>'
```

### ECSサービスが応答しない場合
```bash
# サービス強制再起動
aws ecs update-service --cluster splitmate-cluster --service splitmate-backend-service --force-new-deployment --region ap-northeast-1
```

### RDS接続できない場合
```bash
# RDS状態確認
aws rds describe-db-instances --db-instance-identifier splitmate-mysql --region ap-northeast-1

# セキュリティグループ確認
aws ec2 describe-security-groups --filters "Name=group-name,Values=splitmate-db-sg" --region ap-northeast-1
```

## 💰 コスト節約

| 状況 | コマンド | 節約効果 |
|------|---------|----------|
| 夜間・週末 | `./scripts/stop-aws-resources.sh` | 約80%削減 |
| 長期休止 | `./scripts/delete-aws-resources.sh` | 100%削減 |

## 📞 重要な設定ファイル

```bash
# Terraform設定
infra/terraform/terraform.tfvars

# ローカル開発設定
docker-compose.dev.yml

# AWS設定
~/.aws/credentials
~/.aws/config
```

## 🔗 クイックリンク

- [詳細ガイド](project-resume-guide.md)
- [AWS管理](aws-resource-bulk-management.md)
- [トラブルシューティング](aws-resource-management-checklist.md) 
