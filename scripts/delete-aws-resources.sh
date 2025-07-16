#!/bin/bash

# =============================================================================
# AWS Resources Delete Script for SplitMate
# =============================================================================
# ⚠️ 警告: このスクリプトはAWSリソースを完全に削除します
# データベースのデータも含めてすべて失われます
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

echo -e "${RED}==============================================================================${NC}"
echo -e "${RED}🗑️  AWS Resources Delete Script for SplitMate${NC}"
echo -e "${RED}==============================================================================${NC}"
echo -e "${RED}⚠️  警告: このスクリプトはすべてのAWSリソースを削除します${NC}"
echo -e "${RED}⚠️  データベースのデータも含めてすべて失われます${NC}"
echo -e "${RED}==============================================================================${NC}"
echo ""

# Function to run AWS commands in clean environment
run_aws_command() {
    env -i /bin/bash -c "export AWS_PAGER='' && /usr/local/bin/aws $*" 2>/dev/null
}

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
    local identity
    if ! identity=$(run_aws_command "sts get-caller-identity --query 'Account' --output text"); then
        echo -e "${RED}❌ AWS credentials not configured. Please run 'aws configure'.${NC}"
        exit 1
    fi
    
    local aws_account="$identity"
    local aws_region=$(env -i /bin/bash -c '/usr/local/bin/aws configure get region' 2>/dev/null || echo "not set")
    echo -e "${GREEN}✅ AWS CLI configured${NC}"
    echo -e "${BLUE}   Account: ${aws_account}${NC}"
    echo -e "${BLUE}   Region: ${aws_region}${NC}"
    
    echo ""
}

# Function to check Terraform state
check_terraform_state() {
    echo -e "${BLUE}🔍 Terraform状態の確認中...${NC}"
    
    if [[ ! -d "$TERRAFORM_DIR" ]]; then
        echo -e "${RED}❌ Terraformディレクトリが見つかりません: ${TERRAFORM_DIR}${NC}"
        exit 1
    fi
    
    cd "$TERRAFORM_DIR"
    
    # Check if Terraform is initialized
    if [[ ! -d ".terraform" ]]; then
        echo -e "${YELLOW}⚠️  Terraformが初期化されていません。初期化を実行します...${NC}"
        if ! terraform init; then
            echo -e "${RED}❌ Terraform初期化に失敗しました${NC}"
            cd - > /dev/null
            exit 1
        fi
    fi
    
    # Check if there are any resources to destroy
    local state_list
    if state_list=$(terraform state list 2>/dev/null); then
        if [[ -z "$state_list" ]]; then
            echo -e "${YELLOW}⚠️  削除対象のリソースはありません${NC}"
            echo -e "${GREEN}Terraformステートは空です${NC}"
            cd - > /dev/null
            return 1
        else
            echo -e "${GREEN}✅ Terraform状態確認完了${NC}"
            echo -e "${BLUE}管理中のリソース数: $(echo "$state_list" | wc -l | tr -d ' ')${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  Terraformステートの確認に失敗しました${NC}"
        echo -e "${BLUE}初期状態またはエラーの可能性があります${NC}"
    fi
    
    cd - > /dev/null
    echo ""
    return 0
}

# Function to show current resources
show_current_resources() {
    echo -e "${BLUE}📋 現在のAWSリソースの確認中...${NC}"
    
    local region="ap-northeast-1"
    local resources_found=false
    
    # Check ECS Resources
    echo -e "${YELLOW}🔍 ECSリソース:${NC}"
    local cluster_status=$(run_aws_command "ecs describe-clusters --clusters splitmate-cluster --region $region --query 'clusters[0].status' --output text" || echo "NOT_FOUND")
    if [[ "$cluster_status" != "NOT_FOUND" && "$cluster_status" != "None" ]]; then
        echo -e "${RED}   • ECS Cluster: splitmate-cluster (${cluster_status})${NC}"
        resources_found=true
        
        # Check ECS Services
        local backend_service=$(run_aws_command "ecs describe-services --cluster splitmate-cluster --services splitmate-backend-service --region $region --query 'services[0].status' --output text" || echo "NOT_FOUND")
        if [[ "$backend_service" != "NOT_FOUND" && "$backend_service" != "None" ]]; then
            echo -e "${RED}   • ECS Service: splitmate-backend-service (${backend_service})${NC}"
        fi
        
        local frontend_service=$(run_aws_command "ecs describe-services --cluster splitmate-cluster --services splitmate-frontend-service --region $region --query 'services[0].status' --output text" || echo "NOT_FOUND")
        if [[ "$frontend_service" != "NOT_FOUND" && "$frontend_service" != "None" ]]; then
            echo -e "${RED}   • ECS Service: splitmate-frontend-service (${frontend_service})${NC}"
        fi
    else
        echo -e "${GREEN}   • ECS Cluster: 見つかりません${NC}"
    fi
    
    # Check RDS
    echo -e "${YELLOW}🔍 RDSリソース:${NC}"
    local rds_status=$(run_aws_command "rds describe-db-instances --db-instance-identifier splitmate-mysql --region $region --query 'DBInstances[0].DBInstanceStatus' --output text" || echo "NOT_FOUND")
    if [[ "$rds_status" != "NOT_FOUND" && "$rds_status" != "None" ]]; then
        echo -e "${RED}   • RDS Instance: splitmate-mysql (${rds_status})${NC}"
        echo -e "${RED}     ⚠️  データベースのデータも削除されます${NC}"
        resources_found=true
    else
        echo -e "${GREEN}   • RDS Instance: 見つかりません${NC}"
    fi
    
    # Check Load Balancer
    echo -e "${YELLOW}🔍 Load Balancerリソース:${NC}"
    local alb_status=$(run_aws_command "elbv2 describe-load-balancers --names splitmate-alb --region $region --query 'LoadBalancers[0].State.Code' --output text" || echo "NOT_FOUND")
    if [[ "$alb_status" != "NOT_FOUND" && "$alb_status" != "None" ]]; then
        echo -e "${RED}   • Application Load Balancer: splitmate-alb (${alb_status})${NC}"
        resources_found=true
    else
        echo -e "${GREEN}   • Application Load Balancer: 見つかりません${NC}"
    fi
    
    # Check ECR Repositories
    echo -e "${YELLOW}🔍 ECRリポジトリ:${NC}"
    local backend_repo=$(run_aws_command "ecr describe-repositories --repository-names splitmate-backend --region $region --query 'repositories[0].repositoryName' --output text" || echo "NOT_FOUND")
    if [[ "$backend_repo" != "NOT_FOUND" && "$backend_repo" != "None" ]]; then
        echo -e "${RED}   • ECR Repository: splitmate-backend${NC}"
        echo -e "${RED}     ⚠️  コンテナイメージも削除されます${NC}"
        resources_found=true
    else
        echo -e "${GREEN}   • ECR Repository (Backend): 見つかりません${NC}"
    fi
    
    local frontend_repo=$(run_aws_command "ecr describe-repositories --repository-names splitmate-frontend --region $region --query 'repositories[0].repositoryName' --output text" || echo "NOT_FOUND")
    if [[ "$frontend_repo" != "NOT_FOUND" && "$frontend_repo" != "None" ]]; then
        echo -e "${RED}   • ECR Repository: splitmate-frontend${NC}"
        echo -e "${RED}     ⚠️  コンテナイメージも削除されます${NC}"
        resources_found=true
    else
        echo -e "${GREEN}   • ECR Repository (Frontend): 見つかりません${NC}"
    fi
    
    echo ""
    
    if [[ "$resources_found" == false ]]; then
        echo -e "${GREEN}✅ 削除対象のリソースは見つかりませんでした${NC}"
        return 1
    fi
    
    return 0
}

# Function to plan Terraform destroy
plan_terraform_destroy() {
    echo -e "${BLUE}📋 Terraform削除計画の作成中...${NC}"
    
    cd "$TERRAFORM_DIR"
    
    local plan_output
    if plan_output=$(terraform plan -destroy -detailed-exitcode 2>&1); then
        local exit_code=$?
        case $exit_code in
            0)
                echo -e "${YELLOW}ℹ️  削除対象のリソースはありません${NC}"
                echo -e "${GREEN}Terraformで管理されているリソースはありません${NC}"
                cd - > /dev/null
                return 2
                ;;
            2)
                echo -e "${BLUE}📄 削除計画:${NC}"
                echo "$plan_output"
                echo ""
                echo -e "${GREEN}✅ 削除計画作成完了${NC}"
                cd - > /dev/null
                return 0
                ;;
        esac
    else
        echo -e "${RED}❌ 削除計画作成に失敗しました${NC}"
        echo "$plan_output"
        cd - > /dev/null
        exit 1
    fi
}

# Function to perform multiple confirmations
multiple_confirmations() {
    echo -e "${RED}==============================================================================${NC}"
    echo -e "${RED}⚠️  最終確認 - 削除されるリソース⚠️${NC}"
    echo -e "${RED}==============================================================================${NC}"
    echo -e "${RED}以下のリソースが完全に削除されます:${NC}"
    echo -e "${RED}• VPC, Subnets, Security Groups${NC}"
    echo -e "${RED}• RDS MySQL Instance (すべてのデータが失われます)${NC}"
    echo -e "${RED}• ECS Cluster and Services${NC}"
    echo -e "${RED}• Application Load Balancer${NC}"
    echo -e "${RED}• ECR Repositories (すべてのイメージが失われます)${NC}"
    echo -e "${RED}• NAT Gateway, Elastic IP${NC}"
    echo ""
    echo -e "${YELLOW}📝 重要な注意事項:${NC}"
    echo -e "${YELLOW}• この操作は取り消せません${NC}"
    echo -e "${YELLOW}• データベースのすべてのデータが失われます${NC}"
    echo -e "${YELLOW}• アプリケーションが完全に停止します${NC}"
    echo -e "${YELLOW}• コンテナイメージも削除され、再デプロイが必要です${NC}"
    echo ""
    
    # First confirmation
    echo -e "${RED}1. 本当に削除しますか？ (yes/NO): ${NC}"
    read -r response1
    if [[ "$response1" != "yes" ]]; then
        echo -e "${BLUE}❌ 操作をキャンセルしました${NC}"
        exit 0
    fi
    
    # Second confirmation with project name
    echo -e "${RED}2. プロジェクト名を入力してください (splitmate): ${NC}"
    read -r response2
    if [[ "$response2" != "splitmate" ]]; then
        echo -e "${BLUE}❌ プロジェクト名が一致しません。操作をキャンセルしました${NC}"
        exit 0
    fi
    
    # Third confirmation with random number
    local random_num=$(shuf -i 1000-9999 -n 1)
    echo -e "${RED}3. 確認のため、次の数字を入力してください: ${random_num}${NC}"
    read -r response3
    if [[ "$response3" != "$random_num" ]]; then
        echo -e "${BLUE}❌ 数字が一致しません。操作をキャンセルしました${NC}"
        exit 0
    fi
    
    echo ""
    echo -e "${GREEN}✅ すべての確認が完了しました${NC}"
    echo ""
}

# Function to destroy Terraform resources
destroy_terraform() {
    echo -e "${RED}🗑️  AWSリソースの削除を開始します...${NC}"
    
    cd "$TERRAFORM_DIR"
    
    if terraform destroy -auto-approve; then
        echo -e "${GREEN}✅ AWSリソース削除完了${NC}"
    else
        echo -e "${RED}❌ AWSリソース削除に失敗しました${NC}"
        echo -e "${YELLOW}💡 手動でAWSコンソールから確認し、残ったリソースを削除してください${NC}"
        cd - > /dev/null
        exit 1
    fi
    
    cd - > /dev/null
    echo ""
}

# Function to verify resources are deleted
verify_deletion() {
    echo -e "${BLUE}🔍 削除確認中...${NC}"
    
    local region="ap-northeast-1"
    local remaining_resources=()
    
    # Check ECS Cluster
    local cluster_status=$(run_aws_command "ecs describe-clusters --clusters splitmate-cluster --region $region --query 'clusters[0].status' --output text" || echo "NOT_FOUND")
    if [[ "$cluster_status" != "NOT_FOUND" && "$cluster_status" != "None" ]]; then
        remaining_resources+=("ECS Cluster: splitmate-cluster")
    fi
    
    # Check RDS Instance
    local rds_status=$(run_aws_command "rds describe-db-instances --db-instance-identifier splitmate-mysql --region $region --query 'DBInstances[0].DBInstanceStatus' --output text" || echo "NOT_FOUND")
    if [[ "$rds_status" != "NOT_FOUND" && "$rds_status" != "None" ]]; then
        remaining_resources+=("RDS Instance: splitmate-mysql")
    fi
    
    # Check Load Balancer
    local alb_status=$(run_aws_command "elbv2 describe-load-balancers --names splitmate-alb --region $region --query 'LoadBalancers[0].State.Code' --output text" || echo "NOT_FOUND")
    if [[ "$alb_status" != "NOT_FOUND" && "$alb_status" != "None" ]]; then
        remaining_resources+=("Application Load Balancer: splitmate-alb")
    fi
    
    # Check ECR Repositories
    local backend_repo=$(run_aws_command "ecr describe-repositories --repository-names splitmate-backend --region $region --query 'repositories[0].repositoryName' --output text" || echo "NOT_FOUND")
    if [[ "$backend_repo" != "NOT_FOUND" && "$backend_repo" != "None" ]]; then
        remaining_resources+=("ECR Repository: splitmate-backend")
    fi
    
    local frontend_repo=$(run_aws_command "ecr describe-repositories --repository-names splitmate-frontend --region $region --query 'repositories[0].repositoryName' --output text" || echo "NOT_FOUND")
    if [[ "$frontend_repo" != "NOT_FOUND" && "$frontend_repo" != "None" ]]; then
        remaining_resources+=("ECR Repository: splitmate-frontend")
    fi
    
    if [[ ${#remaining_resources[@]} -eq 0 ]]; then
        echo -e "${GREEN}✅ すべてのリソースが正常に削除されました${NC}"
    else
        echo -e "${YELLOW}⚠️  以下のリソースが残っています:${NC}"
        for resource in "${remaining_resources[@]}"; do
            echo -e "${YELLOW}   • ${resource}${NC}"
        done
        echo -e "${BLUE}💡 これらのリソースは手動でAWSコンソールから削除してください${NC}"
    fi
    
    echo ""
}

# Function to clean up local Terraform state
cleanup_terraform_state() {
    echo -e "${BLUE}🧹 Terraformステートのクリーンアップ...${NC}"
    
    cd "$TERRAFORM_DIR"
    
    # Remove state files if they exist
    if [[ -f "terraform.tfstate" ]]; then
        echo -e "${YELLOW}🗑️  terraform.tfstateを削除中...${NC}"
        rm -f terraform.tfstate
    fi
    
    if [[ -f "terraform.tfstate.backup" ]]; then
        echo -e "${YELLOW}🗑️  terraform.tfstate.backupを削除中...${NC}"
        rm -f terraform.tfstate.backup
    fi
    
    # Remove .terraform directory
    if [[ -d ".terraform" ]]; then
        echo -e "${YELLOW}🗑️  .terraformディレクトリを削除中...${NC}"
        rm -rf .terraform
    fi
    
    echo -e "${GREEN}✅ Terraformステートクリーンアップ完了${NC}"
    
    cd - > /dev/null
    echo ""
}

# Main execution
main() {
    check_prerequisites
    
    if ! check_terraform_state; then
        echo -e "${BLUE}終了しました${NC}"
        exit 0
    fi
    
    if ! show_current_resources; then
        echo -e "${BLUE}終了しました${NC}"
        exit 0
    fi
    
    if plan_terraform_destroy; then
        local plan_result=$?
        if [[ $plan_result -eq 2 ]]; then
            echo -e "${BLUE}終了しました${NC}"
            exit 0
        fi
        
        multiple_confirmations
        destroy_terraform
        verify_deletion
        cleanup_terraform_state
        
        echo -e "${BLUE}==============================================================================${NC}"
        echo -e "${GREEN}🎉 AWSリソースの削除が完了しました${NC}"
        echo -e "${BLUE}==============================================================================${NC}"
        echo ""
        echo -e "${BLUE}📝 削除されたリソース:${NC}"
        echo -e "${GREEN}✅ すべてのAWSリソースが削除されました${NC}"
        echo -e "${GREEN}✅ Terraformステートがクリーンアップされました${NC}"
        echo ""
        echo -e "${BLUE}💡 再度リソースを作成する場合:${NC}"
        echo -e "${YELLOW}   scripts/create-aws-resources.sh${NC}"
        echo ""
        echo -e "${BLUE}終了しました${NC}"
    fi
}

# Run main function
main "$@" 
