# AWS リソース一括管理スクリプト

## 概要

SplitMateプロジェクト用のAWSリソースを一括で作成・削除するためのスクリプトです。  
Terraformを使用してインフラストラクチャをコードとして管理し、安全かつ確実にリソースの操作を行います。

## 📁 スクリプト一覧

| スクリプト | 機能 | 用途 |
|-----------|------|------|
| `scripts/create-aws-resources.sh` | AWSリソース一括作成 | プロジェクト開始時、新環境構築時 |
| `scripts/delete-aws-resources.sh` | AWSリソース一括削除 | プロジェクト終了時、環境クリーンアップ時 |
| `scripts/start-aws-resources.sh` | 既存リソース開始 | 一時停止したリソースの再開 |
| `scripts/stop-aws-resources.sh` | 既存リソース停止 | コスト削減のための一時停止 |

## 🔧 事前準備

### 1. 必要なツールのインストール

```bash
# Terraform のインストール (Homebrew)
brew install terraform

# AWS CLI のインストール (Homebrew)
brew install awscli
```

### 2. AWS認証設定

```bash
# AWS CLIの設定
aws configure

# 入力項目:
# AWS Access Key ID: [Your Access Key]
# AWS Secret Access Key: [Your Secret Key]
# Default region name: ap-northeast-1
# Default output format: json
```

### 3. Terraform変数の設定

```bash
# サンプルファイルをコピー
cp infra/terraform/terraform.tfvars.example infra/terraform/terraform.tfvars

# terraform.tfvars を編集
vim infra/terraform/terraform.tfvars
```

必要な設定項目：
- `google_client_id`: Google OAuth Client ID
- `google_client_secret`: Google OAuth Client Secret  
- `session_secret`: セッション暗号化用のシークレット

## 🚀 AWSリソース作成

### 使用方法

```bash
./scripts/create-aws-resources.sh
```

### 作成されるリソース

- **VPC**: カスタムVPC（CIDR: 10.0.0.0/16）
- **Subnets**: パブリック/プライベートサブネット（ap-northeast-1a, 1c）
- **Security Groups**: ECS、RDS、ALB用のセキュリティグループ
- **RDS**: MySQL 8.0インスタンス（db.t3.micro）
- **ECS**: Fargateクラスター、サービス、タスク定義
- **ALB**: Application Load Balancer
- **ECR**: Backend/Frontend用コンテナレジストリ
- **NAT Gateway**: プライベートサブネット用インターネット接続
- **Elastic IP**: NAT Gateway用固定IP

### 実行の流れ

1. **前提条件チェック**: Terraform、AWS CLIの確認
2. **Terraform変数確認**: terraform.tfvarsの設定チェック
3. **実行計画表示**: 作成されるリソースの詳細表示
4. **確認**: ユーザーによる実行確認
5. **リソース作成**: terraform apply実行
6. **結果表示**: 作成されたリソースの情報表示
7. **動作確認**: リソースの状態確認

### 注意事項

- 💰 **料金**: RDS、NAT Gateway、ECSタスクで料金が発生します
- ⏱️ **時間**: 完了まで約10-15分かかります
- 🔑 **権限**: 適切なIAM権限が必要です

## 🗑️ AWSリソース削除

### 使用方法

```bash
./scripts/delete-aws-resources.sh
```

### ⚠️ 重要な警告

- **データ完全消失**: RDSデータベースのすべてのデータが失われます
- **復旧不可**: 削除操作は取り消すことができません
- **アプリ停止**: アプリケーションが完全に停止します
- **イメージ削除**: ECRのコンテナイメージも削除されます

### 安全機能

1. **3段階確認**:
   - 削除確認（"yes"の入力が必要）
   - プロジェクト名確認（"splitmate"の入力が必要）
   - ランダム数字確認（画面表示された数字の入力が必要）

2. **事前チェック**:
   - 現在のリソース状態表示
   - Terraformステート確認
   - 削除計画の詳細表示

3. **削除後確認**:
   - 実際の削除状況確認
   - 残ったリソースの報告
   - Terraformステートクリーンアップ

## 🔄 既存リソースの開始・停止

コスト削減のため、既存リソースを一時的に停止することができます：

```bash
# リソース停止（料金削減）
./scripts/stop-aws-resources.sh

# リソース開始（サービス復旧）
./scripts/start-aws-resources.sh
```

**注意**: これらはリソースを削除するのではなく、一時停止するものです。

## 💰 料金について

### 主な料金発生リソース

1. **RDS MySQL**:
   - db.t3.micro: 約 $0.017/時間
   - ストレージ: 20GB約 $2.3/月

2. **NAT Gateway**:
   - 約 $0.045/時間 + データ転送料

3. **ECS Fargate**:
   - 0.25 vCPU, 0.5GB: 約 $0.01265/時間（タスクあたり）

4. **Application Load Balancer**:
   - 約 $0.0225/時間 + LCU料金

### 料金節約のコツ

- 開発時間外は `stop-aws-resources.sh` でリソース停止
- 長期間使用しない場合は `delete-aws-resources.sh` で完全削除
- 不要なECSタスクは手動でdesired countを0に設定

## 🛠️ トラブルシューティング

### 作成時の一般的なエラー

**Terraform初期化エラー**:
```bash
cd infra/terraform
terraform init
```

**AWS認証エラー**:
```bash
aws sts get-caller-identity  # 認証確認
aws configure  # 再設定
```

**terraform.tfvarsエラー**:
- ファイルが存在するか確認
- 必要な変数がすべて設定されているか確認

### 削除時の一般的なエラー

**リソース依存関係エラー**:
- ECSサービスを先に停止
- セキュリティグループの参照を確認

**権限エラー**:
- IAMポリシーで削除権限を確認
- MFA設定の確認

**残ったリソースの手動削除**:
1. AWSコンソールにログイン
2. 該当リージョン（ap-northeast-1）を選択
3. 各サービスでsplitmateプレフィックスのリソースを削除

## 📝 ログとデバッグ

### Terraformログの有効化

```bash
export TF_LOG=DEBUG
export TF_LOG_PATH=./terraform.log
```

### AWSリソースの手動確認

```bash
# ECSクラスター確認
aws ecs describe-clusters --clusters splitmate-cluster --region ap-northeast-1

# RDS確認
aws rds describe-db-instances --db-instance-identifier splitmate-mysql --region ap-northeast-1

# ALB確認
aws elbv2 describe-load-balancers --names splitmate-alb --region ap-northeast-1
```

## 🔗 関連ドキュメント

- [AWS Resource Management Checklist](aws-resource-management-checklist.md)
- [Deployment Setup Guide](deployment-setup-guide.md)
- [Development Process](development-process.md)

---

## 📋 チェックリスト

### 作成前チェック
- [ ] Terraform がインストール済み
- [ ] AWS CLI が設定済み
- [ ] terraform.tfvars が正しく設定済み
- [ ] 必要なIAM権限を保有
- [ ] 料金発生についてチーム承認済み

### 削除前チェック
- [ ] データのバックアップが不要であることを確認
- [ ] チームメンバーに削除の通知済み
- [ ] 他の環境への影響がないことを確認
- [ ] 削除後の再構築計画を立案済み

---

⚠️ **重要**: これらのスクリプトはプロダクション環境での使用を想定しています。実行前に必ずチームメンバーと相談し、十分な検討を行ってください。 
