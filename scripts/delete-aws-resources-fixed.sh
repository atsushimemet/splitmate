#!/bin/bash

# =============================================================================
# AWS Resources Delete Script for SplitMate (Fixed Version)
# =============================================================================
# ⚠️ 警告: このスクリプトはAWSリソースを直接削除します
# データベースのデータも含めてすべて失われます
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# AWS configuration
REGION="ap-northeast-1"
CLUSTER_NAME="splitmate-cluster"
BACKEND_SERVICE="splitmate-backend-service"
FRONTEND_SERVICE="splitmate-frontend-service"
RDS_INSTANCE="splitmate-mysql"
ALB_NAME="splitmate-alb"
ECR_BACKEND="splitmate-backend"
ECR_FRONTEND="splitmate-frontend"

# Function to run AWS commands in clean environment
run_aws_command() {
    env -i /bin/bash -c "export AWS_PAGER='' && /usr/local/bin/aws $*" 2>/dev/null
}

echo -e "${RED}==============================================================================${NC}"
echo -e "${RED}🗑️  AWS Resources Delete Script for SplitMate (Fixed)${NC}"
echo -e "${RED}==============================================================================${NC}"
echo -e "${RED}⚠️  警告: このスクリプトはすべてのAWSリソースを直接削除します${NC}"
echo -e "${RED}⚠️  データベースのデータも含めてすべて失われます${NC}"
echo -e "${RED}==============================================================================${NC}"
echo ""

# Function to check AWS CLI
check_aws_cli() {
    echo -e "${BLUE}🔍 AWS CLIの確認中...${NC}"
    
    if ! command -v /usr/local/bin/aws &> /dev/null; then
        echo -e "${RED}❌ AWS CLI not found at /usr/local/bin/aws${NC}"
        exit 1
    fi
    
    # Test AWS credentials with clean environment
    local identity
    if identity=$(run_aws_command "sts get-caller-identity --query 'Account' --output text"); then
        echo -e "${GREEN}✅ AWS CLI configured - Account: ${identity}${NC}"
    else
        echo -e "${RED}❌ AWS credentials not configured or invalid${NC}"
        exit 1
    fi
    
    echo ""
}

# Function to show current resources
show_current_resources() {
    echo -e "${BLUE}📋 現在のAWSリソースの確認中...${NC}"
    
    local resources_found=false
    
    # Check ECS Resources
    echo -e "${YELLOW}🔍 ECSリソース:${NC}"
    local cluster_status=$(run_aws_command "ecs describe-clusters --clusters $CLUSTER_NAME --region $REGION --query 'clusters[0].status' --output text" || echo "NOT_FOUND")
    if [[ "$cluster_status" != "NOT_FOUND" && "$cluster_status" != "None" ]]; then
        echo -e "${RED}   • ECS Cluster: $CLUSTER_NAME (${cluster_status})${NC}"
        resources_found=true
        
        # Check ECS Services
        local backend_service=$(run_aws_command "ecs describe-services --cluster $CLUSTER_NAME --services $BACKEND_SERVICE --region $REGION --query 'services[0].status' --output text" || echo "NOT_FOUND")
        if [[ "$backend_service" != "NOT_FOUND" && "$backend_service" != "None" ]]; then
            echo -e "${RED}   • ECS Service: $BACKEND_SERVICE (${backend_service})${NC}"
        fi
        
        local frontend_service=$(run_aws_command "ecs describe-services --cluster $CLUSTER_NAME --services $FRONTEND_SERVICE --region $REGION --query 'services[0].status' --output text" || echo "NOT_FOUND")
        if [[ "$frontend_service" != "NOT_FOUND" && "$frontend_service" != "None" ]]; then
            echo -e "${RED}   • ECS Service: $FRONTEND_SERVICE (${frontend_service})${NC}"
        fi
    else
        echo -e "${GREEN}   • ECS Cluster: 見つかりません${NC}"
    fi
    
    # Check RDS
    echo -e "${YELLOW}🔍 RDSリソース:${NC}"
    local rds_status=$(run_aws_command "rds describe-db-instances --db-instance-identifier $RDS_INSTANCE --region $REGION --query 'DBInstances[0].DBInstanceStatus' --output text" || echo "NOT_FOUND")
    if [[ "$rds_status" != "NOT_FOUND" && "$rds_status" != "None" ]]; then
        echo -e "${RED}   • RDS Instance: $RDS_INSTANCE (${rds_status})${NC}"
        echo -e "${RED}     ⚠️  データベースのデータも削除されます${NC}"
        resources_found=true
    else
        echo -e "${GREEN}   • RDS Instance: 見つかりません${NC}"
    fi
    
    # Check Load Balancer
    echo -e "${YELLOW}🔍 Load Balancerリソース:${NC}"
    local alb_status=$(run_aws_command "elbv2 describe-load-balancers --names $ALB_NAME --region $REGION --query 'LoadBalancers[0].State.Code' --output text" || echo "NOT_FOUND")
    if [[ "$alb_status" != "NOT_FOUND" && "$alb_status" != "None" ]]; then
        echo -e "${RED}   • Application Load Balancer: $ALB_NAME (${alb_status})${NC}"
        resources_found=true
    else
        echo -e "${GREEN}   • Application Load Balancer: 見つかりません${NC}"
    fi
    
    # Check ECR Repositories
    echo -e "${YELLOW}🔍 ECRリポジトリ:${NC}"
    local backend_repo=$(run_aws_command "ecr describe-repositories --repository-names $ECR_BACKEND --region $REGION --query 'repositories[0].repositoryName' --output text" || echo "NOT_FOUND")
    if [[ "$backend_repo" != "NOT_FOUND" && "$backend_repo" != "None" ]]; then
        echo -e "${RED}   • ECR Repository: $ECR_BACKEND${NC}"
        echo -e "${RED}     ⚠️  コンテナイメージも削除されます${NC}"
        resources_found=true
    else
        echo -e "${GREEN}   • ECR Repository (Backend): 見つかりません${NC}"
    fi
    
    local frontend_repo=$(run_aws_command "ecr describe-repositories --repository-names $ECR_FRONTEND --region $REGION --query 'repositories[0].repositoryName' --output text" || echo "NOT_FOUND")
    if [[ "$frontend_repo" != "NOT_FOUND" && "$frontend_repo" != "None" ]]; then
        echo -e "${RED}   • ECR Repository: $ECR_FRONTEND${NC}"
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

# Function to delete ECS services
delete_ecs_services() {
    echo -e "${RED}🗑️  ECSサービスの削除中...${NC}"
    
    # Stop backend service
    local backend_service=$(run_aws_command "ecs describe-services --cluster $CLUSTER_NAME --services $BACKEND_SERVICE --region $REGION --query 'services[0].status' --output text" || echo "NOT_FOUND")
    if [[ "$backend_service" != "NOT_FOUND" && "$backend_service" != "None" ]]; then
        echo -e "${YELLOW}🔄 Backend serviceを削除中...${NC}"
        if run_aws_command "ecs update-service --cluster $CLUSTER_NAME --service $BACKEND_SERVICE --desired-count 0 --region $REGION" >/dev/null; then
            sleep 10
            if run_aws_command "ecs delete-service --cluster $CLUSTER_NAME --service $BACKEND_SERVICE --region $REGION" >/dev/null; then
                echo -e "${GREEN}✅ Backend service削除完了${NC}"
            else
                echo -e "${YELLOW}⚠️  Backend service削除に失敗（手動削除が必要）${NC}"
            fi
        else
            echo -e "${YELLOW}⚠️  Backend service停止に失敗${NC}"
        fi
    fi
    
    # Stop frontend service
    local frontend_service=$(run_aws_command "ecs describe-services --cluster $CLUSTER_NAME --services $FRONTEND_SERVICE --region $REGION --query 'services[0].status' --output text" || echo "NOT_FOUND")
    if [[ "$frontend_service" != "NOT_FOUND" && "$frontend_service" != "None" ]]; then
        echo -e "${YELLOW}🔄 Frontend serviceを削除中...${NC}"
        if run_aws_command "ecs update-service --cluster $CLUSTER_NAME --service $FRONTEND_SERVICE --desired-count 0 --region $REGION" >/dev/null; then
            sleep 10
            if run_aws_command "ecs delete-service --cluster $CLUSTER_NAME --service $FRONTEND_SERVICE --region $REGION" >/dev/null; then
                echo -e "${GREEN}✅ Frontend service削除完了${NC}"
            else
                echo -e "${YELLOW}⚠️  Frontend service削除に失敗（手動削除が必要）${NC}"
            fi
        else
            echo -e "${YELLOW}⚠️  Frontend service停止に失敗${NC}"
        fi
    fi
    
    echo ""
}

# Function to delete RDS instance
delete_rds_instance() {
    echo -e "${RED}🗑️  RDSインスタンスの削除中...${NC}"
    
    local rds_status=$(run_aws_command "rds describe-db-instances --db-instance-identifier $RDS_INSTANCE --region $REGION --query 'DBInstances[0].DBInstanceStatus' --output text" || echo "NOT_FOUND")
    if [[ "$rds_status" != "NOT_FOUND" && "$rds_status" != "None" ]]; then
        echo -e "${YELLOW}🔄 RDS Instanceを削除中...${NC}"
        if run_aws_command "rds delete-db-instance --db-instance-identifier $RDS_INSTANCE --skip-final-snapshot --region $REGION" >/dev/null; then
            echo -e "${GREEN}✅ RDS Instance削除開始（完了まで数分かかります）${NC}"
        else
            echo -e "${YELLOW}⚠️  RDS Instance削除に失敗（手動削除が必要）${NC}"
        fi
    fi
    
    echo ""
}

# Function to delete ECR repositories
delete_ecr_repositories() {
    echo -e "${RED}🗑️  ECRリポジトリの削除中...${NC}"
    
    # Delete backend repository
    local backend_repo=$(run_aws_command "ecr describe-repositories --repository-names $ECR_BACKEND --region $REGION --query 'repositories[0].repositoryName' --output text" || echo "NOT_FOUND")
    if [[ "$backend_repo" != "NOT_FOUND" && "$backend_repo" != "None" ]]; then
        echo -e "${YELLOW}🔄 Backend ECR repositoryを削除中...${NC}"
        if run_aws_command "ecr delete-repository --repository-name $ECR_BACKEND --force --region $REGION" >/dev/null; then
            echo -e "${GREEN}✅ Backend ECR repository削除完了${NC}"
        else
            echo -e "${YELLOW}⚠️  Backend ECR repository削除に失敗（手動削除が必要）${NC}"
        fi
    fi
    
    # Delete frontend repository
    local frontend_repo=$(run_aws_command "ecr describe-repositories --repository-names $ECR_FRONTEND --region $REGION --query 'repositories[0].repositoryName' --output text" || echo "NOT_FOUND")
    if [[ "$frontend_repo" != "NOT_FOUND" && "$frontend_repo" != "None" ]]; then
        echo -e "${YELLOW}🔄 Frontend ECR repositoryを削除中...${NC}"
        if run_aws_command "ecr delete-repository --repository-name $ECR_FRONTEND --force --region $REGION" >/dev/null; then
            echo -e "${GREEN}✅ Frontend ECR repository削除完了${NC}"
        else
            echo -e "${YELLOW}⚠️  Frontend ECR repository削除に失敗（手動削除が必要）${NC}"
        fi
    fi
    
    echo ""
}

# Function to show manual cleanup instructions
show_manual_cleanup() {
    echo -e "${BLUE}==============================================================================${NC}"
    echo -e "${BLUE}📝 手動削除が必要な場合の手順${NC}"
    echo -e "${BLUE}==============================================================================${NC}"
    echo ""
    echo -e "${YELLOW}⚠️  一部のリソースは依存関係により自動削除できない場合があります${NC}"
    echo -e "${BLUE}以下の順序で手動削除してください:${NC}"
    echo ""
    echo -e "${GREEN}1. ECS Cluster周辺リソース:${NC}"
    echo -e "${BLUE}   - ECS Services (まだ残っている場合)${NC}"
    echo -e "${BLUE}   - ECS Task Definitions${NC}"
    echo -e "${BLUE}   - ECS Cluster${NC}"
    echo ""
    echo -e "${GREEN}2. Application Load Balancer周辺:${NC}"
    echo -e "${BLUE}   - Target Groups${NC}"
    echo -e "${BLUE}   - Load Balancer${NC}"
    echo ""
    echo -e "${GREEN}3. VPC周辺リソース:${NC}"
    echo -e "${BLUE}   - NAT Gateway${NC}"
    echo -e "${BLUE}   - Elastic IP${NC}"
    echo -e "${BLUE}   - Internet Gateway${NC}"
    echo -e "${BLUE}   - Route Tables${NC}"
    echo -e "${BLUE}   - Subnets${NC}"
    echo -e "${BLUE}   - Security Groups${NC}"
    echo -e "${BLUE}   - VPC${NC}"
    echo ""
    echo -e "${GREEN}4. その他:${NC}"
    echo -e "${BLUE}   - CloudWatch Log Groups${NC}"
    echo -e "${BLUE}   - IAM Roles (もし残っている場合)${NC}"
    echo ""
    echo -e "${BLUE}💡 すべて 'splitmate' プレフィックスで検索してください${NC}"
    echo ""
}

# Function to try Terraform cleanup
try_terraform_cleanup() {
    echo -e "${BLUE}🧹 Terraformステートのクリーンアップ...${NC}"
    
    local terraform_dir="infra/terraform"
    if [[ -d "$terraform_dir" ]]; then
        cd "$terraform_dir"
        
        # Try terraform destroy as fallback
        if [[ -f "terraform.tfstate" ]]; then
            echo -e "${YELLOW}⚠️  Terraformステートファイルが存在します。Terraform destroyを試行します...${NC}"
            if terraform destroy -auto-approve 2>/dev/null; then
                echo -e "${GREEN}✅ Terraform destroy成功${NC}"
            else
                echo -e "${YELLOW}⚠️  Terraform destroyに失敗しました${NC}"
            fi
        fi
        
        # Clean up state files
        if [[ -f "terraform.tfstate" ]]; then
            echo -e "${YELLOW}🗑️  terraform.tfstateを削除中...${NC}"
            rm -f terraform.tfstate
        fi
        
        if [[ -f "terraform.tfstate.backup" ]]; then
            echo -e "${YELLOW}🗑️  terraform.tfstate.backupを削除中...${NC}"
            rm -f terraform.tfstate.backup
        fi
        
        cd - > /dev/null
    fi
    
    echo ""
}

# Main execution
main() {
    check_aws_cli
    
    if ! show_current_resources; then
        echo -e "${BLUE}終了しました${NC}"
        exit 0
    fi
    
    multiple_confirmations
    
    echo -e "${RED}🚀 リソース削除を開始します...${NC}"
    echo ""
    
    delete_ecs_services
    delete_rds_instance
    delete_ecr_repositories
    try_terraform_cleanup
    
    echo -e "${BLUE}==============================================================================${NC}"
    echo -e "${GREEN}🎉 AWS直接削除スクリプトの実行が完了しました${NC}"
    echo -e "${BLUE}==============================================================================${NC}"
    echo ""
    echo -e "${BLUE}📝 削除されたリソース:${NC}"
    echo -e "${GREEN}✅ ECS Services停止・削除実行${NC}"
    echo -e "${GREEN}✅ RDS Instance削除実行${NC}"
    echo -e "${GREEN}✅ ECR Repositories削除実行${NC}"
    echo -e "${GREEN}✅ Terraformステートクリーンアップ${NC}"
    echo ""
    echo -e "${YELLOW}⚠️  注意: VPC、ALB、その他のネットワークリソースは手動削除が必要な場合があります${NC}"
    echo ""
    
    show_manual_cleanup
    
    echo -e "${BLUE}終了しました${NC}"
}

# Run main function
main "$@" 
