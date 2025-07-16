#!/bin/bash

# =============================================================================
# AWS Resources Create Script for SplitMate
# =============================================================================
# Terraformを使用してAWSリソースを一括作成するスクリプト
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Terraform directory
TERRAFORM_DIR="infra/terraform"
TERRAFORM_VARS_FILE="$TERRAFORM_DIR/terraform.tfvars"
TERRAFORM_VARS_EXAMPLE="$TERRAFORM_DIR/terraform.tfvars.example"

echo -e "${BLUE}==============================================================================${NC}"
echo -e "${BLUE}🔧 AWS Resources Create Script for SplitMate${NC}"
echo -e "${BLUE}==============================================================================${NC}"
echo ""

# Function to check if required tools are available
check_prerequisites() {
    echo -e "${BLUE}🔍 前提条件の確認中...${NC}"
    
    # Check Terraform
    if ! command -v terraform &> /dev/null; then
        echo -e "${RED}❌ Terraform not found. Please install Terraform.${NC}"
        echo -e "${YELLOW}💡 Homebrew: brew install terraform${NC}"
        echo -e "${YELLOW}💡 公式サイト: https://www.terraform.io/downloads${NC}"
        exit 1
    fi
    
    local terraform_version=$(terraform version | head -n1 | grep -o 'v[0-9.]*')
    echo -e "${GREEN}✅ Terraform ${terraform_version} found${NC}"
    
    # Check AWS CLI
    if ! command -v aws &> /dev/null; then
        echo -e "${RED}❌ AWS CLI not found. Please install AWS CLI.${NC}"
        echo -e "${YELLOW}💡 Homebrew: brew install awscli${NC}"
        echo -e "${YELLOW}💡 公式サイト: https://aws.amazon.com/cli/${NC}"
        exit 1
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        echo -e "${RED}❌ AWS credentials not configured. Please run 'aws configure'.${NC}"
        exit 1
    fi
    
    local aws_account=$(aws sts get-caller-identity --query 'Account' --output text)
    local aws_region=$(aws configure get region || echo "not set")
    echo -e "${GREEN}✅ AWS CLI configured${NC}"
    echo -e "${BLUE}   Account: ${aws_account}${NC}"
    echo -e "${BLUE}   Region: ${aws_region}${NC}"
    
    echo ""
}

# Function to check Terraform variables
check_terraform_vars() {
    echo -e "${BLUE}🔍 Terraform設定の確認中...${NC}"
    
    if [[ ! -f "$TERRAFORM_VARS_FILE" ]]; then
        echo -e "${RED}❌ terraform.tfvarsファイルが見つかりません。${NC}"
        echo ""
        echo -e "${YELLOW}📝 設定手順:${NC}"
        echo -e "${YELLOW}1. サンプルファイルをコピー:${NC}"
        echo -e "${BLUE}   cp ${TERRAFORM_VARS_EXAMPLE} ${TERRAFORM_VARS_FILE}${NC}"
        echo -e "${YELLOW}2. terraform.tfvarsを編集して適切な値を設定${NC}"
        echo -e "${YELLOW}3. 必要な設定項目:${NC}"
        echo -e "${BLUE}   - google_client_id${NC}"
        echo -e "${BLUE}   - google_client_secret${NC}"
        echo -e "${BLUE}   - session_secret${NC}"
        echo ""
        
        read -p "今すぐサンプルファイルをコピーしますか？ (y/N): " response
        if [[ "$response" =~ ^[Yy]$ ]]; then
            cp "$TERRAFORM_VARS_EXAMPLE" "$TERRAFORM_VARS_FILE"
            echo -e "${GREEN}✅ terraform.tfvarsを作成しました${NC}"
            echo -e "${YELLOW}⚠️  ${TERRAFORM_VARS_FILE}を編集して適切な値を設定してください${NC}"
            echo -e "${BLUE}設定完了後、再度このスクリプトを実行してください。${NC}"
        else
            echo -e "${BLUE}❌ 操作をキャンセルしました${NC}"
        fi
        exit 1
    fi
    
    echo -e "${GREEN}✅ terraform.tfvarsファイル確認完了${NC}"
    
    # Check required variables in tfvars file
    local missing_vars=()
    if ! grep -q "^google_client_id\s*=" "$TERRAFORM_VARS_FILE" || grep -q "your-google-client-id" "$TERRAFORM_VARS_FILE"; then
        missing_vars+=("google_client_id")
    fi
    if ! grep -q "^google_client_secret\s*=" "$TERRAFORM_VARS_FILE" || grep -q "your-google-client-secret" "$TERRAFORM_VARS_FILE"; then
        missing_vars+=("google_client_secret")
    fi
    if ! grep -q "^session_secret\s*=" "$TERRAFORM_VARS_FILE" || grep -q "your-secure-session-secret" "$TERRAFORM_VARS_FILE"; then
        missing_vars+=("session_secret")
    fi
    
    if [[ ${#missing_vars[@]} -gt 0 ]]; then
        echo -e "${YELLOW}⚠️  以下の変数が未設定または初期値のままです:${NC}"
        for var in "${missing_vars[@]}"; do
            echo -e "${YELLOW}   - ${var}${NC}"
        done
        echo ""
        read -p "このまま続行しますか？ (デプロイ時にエラーが発生する可能性があります) (y/N): " response
        if [[ ! "$response" =~ ^[Yy]$ ]]; then
            echo -e "${BLUE}❌ 操作をキャンセルしました${NC}"
            echo -e "${BLUE}${TERRAFORM_VARS_FILE}を編集して適切な値を設定してください${NC}"
            exit 1
        fi
    fi
    
    echo ""
}

# Function to initialize Terraform
init_terraform() {
    echo -e "${BLUE}🔧 Terraformの初期化中...${NC}"
    
    cd "$TERRAFORM_DIR"
    
    if terraform init; then
        echo -e "${GREEN}✅ Terraform初期化完了${NC}"
    else
        echo -e "${RED}❌ Terraform初期化に失敗しました${NC}"
        cd - > /dev/null
        exit 1
    fi
    
    cd - > /dev/null
    echo ""
}

# Function to plan Terraform changes
plan_terraform() {
    echo -e "${BLUE}📋 Terraform実行計画の作成中...${NC}"
    
    cd "$TERRAFORM_DIR"
    
    local plan_output
    if plan_output=$(terraform plan -detailed-exitcode 2>&1); then
        local exit_code=$?
        case $exit_code in
            0)
                echo -e "${BLUE}📄 実行計画:${NC}"
                echo "$plan_output"
                echo ""
                echo -e "${YELLOW}ℹ️  変更対象のリソースはありません${NC}"
                echo -e "${GREEN}すべてのリソースが既に存在しています${NC}"
                cd - > /dev/null
                return 2
                ;;
            2)
                echo -e "${BLUE}📄 実行計画:${NC}"
                echo "$plan_output"
                echo ""
                echo -e "${GREEN}✅ 実行計画作成完了${NC}"
                cd - > /dev/null
                return 0
                ;;
        esac
    else
        echo -e "${RED}❌ 実行計画作成に失敗しました${NC}"
        echo "$plan_output"
        cd - > /dev/null
        exit 1
    fi
}

# Function to apply Terraform changes
apply_terraform() {
    echo -e "${BLUE}🚀 AWSリソースの作成を開始します...${NC}"
    
    cd "$TERRAFORM_DIR"
    
    if terraform apply -auto-approve; then
        echo -e "${GREEN}✅ AWSリソース作成完了${NC}"
    else
        echo -e "${RED}❌ AWSリソース作成に失敗しました${NC}"
        cd - > /dev/null
        exit 1
    fi
    
    cd - > /dev/null
    echo ""
}

# Function to get Terraform outputs
get_terraform_outputs() {
    echo -e "${BLUE}📊 作成されたリソース情報の取得中...${NC}"
    
    cd "$TERRAFORM_DIR"
    
    local outputs
    if outputs=$(terraform output -json 2>/dev/null); then
        echo -e "${GREEN}✅ リソース情報取得完了${NC}"
        echo ""
        echo -e "${BLUE}==============================================================================${NC}"
        echo -e "${BLUE}🎉 作成されたAWSリソース情報${NC}"
        echo -e "${BLUE}==============================================================================${NC}"
        
        # Parse and display outputs
        echo -e "${GREEN}🌐 アプリケーションURL:${NC}"
        local alb_dns=$(echo "$outputs" | jq -r '.alb_dns_name.value // "N/A"')
        echo -e "${BLUE}   http://${alb_dns}${NC}"
        echo ""
        
        echo -e "${GREEN}🗄️  データベース情報:${NC}"
        local rds_endpoint=$(echo "$outputs" | jq -r '.rds_endpoint.value // "N/A"')
        echo -e "${BLUE}   RDS Endpoint: ${rds_endpoint}${NC}"
        echo ""
        
        echo -e "${GREEN}📦 ECRリポジトリ:${NC}"
        local backend_repo=$(echo "$outputs" | jq -r '.ecr_backend_repository_url.value // "N/A"')
        local frontend_repo=$(echo "$outputs" | jq -r '.ecr_frontend_repository_url.value // "N/A"')
        echo -e "${BLUE}   Backend: ${backend_repo}${NC}"
        echo -e "${BLUE}   Frontend: ${frontend_repo}${NC}"
        echo ""
        
        echo -e "${GREEN}⚙️  ECSリソース:${NC}"
        local cluster_name=$(echo "$outputs" | jq -r '.ecs_cluster_name.value // "N/A"')
        local backend_service=$(echo "$outputs" | jq -r '.backend_service_name.value // "N/A"')
        local frontend_service=$(echo "$outputs" | jq -r '.frontend_service_name.value // "N/A"')
        echo -e "${BLUE}   Cluster: ${cluster_name}${NC}"
        echo -e "${BLUE}   Backend Service: ${backend_service}${NC}"
        echo -e "${BLUE}   Frontend Service: ${frontend_service}${NC}"
        
    else
        echo -e "${YELLOW}⚠️  リソース情報の取得に失敗しました${NC}"
    fi
    
    cd - > /dev/null
    echo ""
}

# Function to verify created resources
verify_resources() {
    echo -e "${BLUE}🔍 作成されたリソースの動作確認中...${NC}"
    
    # Set AWS region for verification
    local region="ap-northeast-1"
    
    # Check ECS Cluster
    local cluster_status=$(aws ecs describe-clusters --clusters "splitmate-cluster" --region "$region" --query 'clusters[0].status' --output text 2>/dev/null || echo "NOT_FOUND")
    if [[ "$cluster_status" == "ACTIVE" ]]; then
        echo -e "${GREEN}✅ ECS Cluster: splitmate-cluster (ACTIVE)${NC}"
    else
        echo -e "${YELLOW}⚠️  ECS Cluster: splitmate-cluster (${cluster_status})${NC}"
    fi
    
    # Check RDS Instance
    local rds_status=$(aws rds describe-db-instances --db-instance-identifier "splitmate-mysql" --region "$region" --query 'DBInstances[0].DBInstanceStatus' --output text 2>/dev/null || echo "NOT_FOUND")
    echo -e "${GREEN}✅ RDS Instance: splitmate-mysql (${rds_status})${NC}"
    
    # Check Load Balancer
    local alb_status=$(aws elbv2 describe-load-balancers --names "splitmate-alb" --region "$region" --query 'LoadBalancers[0].State.Code' --output text 2>/dev/null || echo "NOT_FOUND")
    if [[ "$alb_status" == "active" ]]; then
        echo -e "${GREEN}✅ Application Load Balancer: splitmate-alb (ACTIVE)${NC}"
    else
        echo -e "${YELLOW}⚠️  Application Load Balancer: splitmate-alb (${alb_status})${NC}"
    fi
    
    echo ""
}

# Main execution
main() {
    check_prerequisites
    check_terraform_vars
    
    echo -e "${YELLOW}⚠️  以下のAWSリソースが作成されます:${NC}"
    echo -e "${BLUE}   • VPC, Subnets, Security Groups${NC}"
    echo -e "${BLUE}   • RDS MySQL Instance${NC}"
    echo -e "${BLUE}   • ECS Cluster and Services${NC}"
    echo -e "${BLUE}   • Application Load Balancer${NC}"
    echo -e "${BLUE}   • ECR Repositories${NC}"
    echo -e "${BLUE}   • NAT Gateway, Elastic IP${NC}"
    echo ""
    echo -e "${YELLOW}💰 注意: これらのリソースは料金が発生する可能性があります${NC}"
    echo ""
    
    read -p "作成を実行しますか？ (y/N): " response
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        echo -e "${BLUE}❌ 操作をキャンセルしました${NC}"
        exit 0
    fi
    
    echo ""
    init_terraform
    
    if plan_terraform; then
        local plan_result=$?
        if [[ $plan_result -eq 2 ]]; then
            echo -e "${BLUE}終了しました${NC}"
            exit 0
        fi
        
        echo -e "${YELLOW}最終確認: 上記の変更を適用しますか？ (y/N): ${NC}"
        read -r final_response
        if [[ ! "$final_response" =~ ^[Yy]$ ]]; then
            echo -e "${BLUE}❌ 操作をキャンセルしました${NC}"
            exit 0
        fi
        
        apply_terraform
        get_terraform_outputs
        verify_resources
        
        echo -e "${BLUE}==============================================================================${NC}"
        echo -e "${GREEN}🎉 AWSリソースの作成が完了しました！${NC}"
        echo -e "${BLUE}==============================================================================${NC}"
        echo ""
        echo -e "${BLUE}📝 次のステップ:${NC}"
        echo -e "${YELLOW}1. アプリケーションのデプロイ${NC}"
        echo -e "${YELLOW}2. データベースの初期化${NC}"
        echo -e "${YELLOW}3. 動作確認${NC}"
        echo ""
        echo -e "${BLUE}💡 リソースの停止: scripts/stop-aws-resources.sh${NC}"
        echo -e "${BLUE}💡 リソースの開始: scripts/start-aws-resources.sh${NC}"
        echo -e "${BLUE}💡 リソースの削除: scripts/delete-aws-resources.sh${NC}"
        echo ""
        echo -e "${BLUE}終了しました${NC}"
    fi
}

# Run main function
main "$@" 
