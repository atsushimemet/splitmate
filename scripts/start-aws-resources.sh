#!/bin/bash

# =============================================================================
# AWS Resources Start Script for SplitMate
# =============================================================================
# Issue #33: AWS Resource Management Scripts
# Starts stopped AWS resources to restore application functionality
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# AWS region
REGION="ap-northeast-1"

# Resource names (from Terraform configuration)
CLUSTER_NAME="splitmate-cluster"
BACKEND_SERVICE="splitmate-backend-service"
FRONTEND_SERVICE="splitmate-frontend-service"
RDS_INSTANCE="splitmate-mysql"
ALB_NAME="splitmate-alb"
ECR_BACKEND="splitmate-backend"
ECR_FRONTEND="splitmate-frontend"

echo -e "${BLUE}==============================================================================${NC}"
echo -e "${BLUE}▶️ AWS Resources Start Script for SplitMate${NC}"
echo -e "${BLUE}==============================================================================${NC}"
echo ""

# Function to check if AWS CLI is available
check_aws_cli() {
    if ! command -v aws &> /dev/null; then
        echo -e "${RED}❌ AWS CLI not found. Please install AWS CLI.${NC}"
        exit 1
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        echo -e "${RED}❌ AWS credentials not configured. Please run 'aws configure'.${NC}"
        exit 1
    fi
}

# Function to get resource status
get_resource_status() {
    local resource_type=$1
    local resource_name=$2
    
    case $resource_type in
        "ecs-service")
            local status=$(aws ecs describe-services --cluster "$CLUSTER_NAME" --services "$resource_name" --region "$REGION" --query 'services[0].status' --output text 2>/dev/null || echo "NOT_FOUND")
            local desired=$(aws ecs describe-services --cluster "$CLUSTER_NAME" --services "$resource_name" --region "$REGION" --query 'services[0].desiredCount' --output text 2>/dev/null || echo "0")
            echo "${status}:${desired}"
            ;;
        "rds-instance")
            aws rds describe-db-instances --db-instance-identifier "$resource_name" --region "$REGION" --query 'DBInstances[0].DBInstanceStatus' --output text 2>/dev/null || echo "NOT_FOUND"
            ;;
        "alb")
            aws elbv2 describe-load-balancers --names "$resource_name" --region "$REGION" --query 'LoadBalancers[0].State.Code' --output text 2>/dev/null || echo "NOT_FOUND"
            ;;
        "ecs-cluster")
            aws ecs describe-clusters --clusters "$resource_name" --region "$REGION" --query 'clusters[0].status' --output text 2>/dev/null || echo "NOT_FOUND"
            ;;
        "ecr-repo")
            aws ecr describe-repositories --repository-names "$resource_name" --region "$REGION" --query 'repositories[0].repositoryName' --output text 2>/dev/null || echo "NOT_FOUND"
            ;;
    esac
}

# Function to list startable AWS resources
list_startable_resources() {
    echo -e "${YELLOW}📋 開始可能なAWSリソース:${NC}"
    echo ""
    
    local count=1
    declare -a resources=()
    declare -a resource_types=()
    declare -a resource_names=()
    
    # Check RDS Instance
    rds_status=$(get_resource_status "rds-instance" "$RDS_INSTANCE")
    if [[ "$rds_status" == "stopped" ]]; then
        echo -e "${count}. RDS Instance: ${RDS_INSTANCE} (Status: ${RED}${rds_status}${NC})"
        resources+=("$count")
        resource_types+=("rds-instance")
        resource_names+=("$RDS_INSTANCE")
        ((count++))
    elif [[ "$rds_status" == "available" ]]; then
        echo -e "${count}. RDS Instance: ${RDS_INSTANCE} (Status: ${GREEN}${rds_status}${NC}) - 既に実行中"
        ((count++))
    fi
    
    # Check ECS Services
    backend_status_info=$(get_resource_status "ecs-service" "$BACKEND_SERVICE")
    backend_status=$(echo "$backend_status_info" | cut -d':' -f1)
    backend_desired=$(echo "$backend_status_info" | cut -d':' -f2)
    
    if [[ "$backend_status" == "ACTIVE" && "$backend_desired" == "0" ]]; then
        echo -e "${count}. ECS Service: ${BACKEND_SERVICE} (Status: ${RED}停止中${NC}, Desired: ${backend_desired})"
        resources+=("$count")
        resource_types+=("ecs-service")
        resource_names+=("$BACKEND_SERVICE")
        ((count++))
    elif [[ "$backend_status" == "ACTIVE" && "$backend_desired" != "0" ]]; then
        echo -e "${count}. ECS Service: ${BACKEND_SERVICE} (Status: ${GREEN}実行中${NC}, Desired: ${backend_desired}) - 既に実行中"
        ((count++))
    fi
    
    frontend_status_info=$(get_resource_status "ecs-service" "$FRONTEND_SERVICE")
    frontend_status=$(echo "$frontend_status_info" | cut -d':' -f1)
    frontend_desired=$(echo "$frontend_status_info" | cut -d':' -f2)
    
    if [[ "$frontend_status" == "ACTIVE" && "$frontend_desired" == "0" ]]; then
        echo -e "${count}. ECS Service: ${FRONTEND_SERVICE} (Status: ${RED}停止中${NC}, Desired: ${frontend_desired})"
        resources+=("$count")
        resource_types+=("ecs-service")
        resource_names+=("$FRONTEND_SERVICE")
        ((count++))
    elif [[ "$frontend_status" == "ACTIVE" && "$frontend_desired" != "0" ]]; then
        echo -e "${count}. ECS Service: ${FRONTEND_SERVICE} (Status: ${GREEN}実行中${NC}, Desired: ${frontend_desired}) - 既に実行中"
        ((count++))
    fi
    
    # Check ALB (informational)
    alb_status=$(get_resource_status "alb" "$ALB_NAME")
    if [[ "$alb_status" == "active" ]]; then
        echo -e "${count}. Application Load Balancer: ${ALB_NAME} (Status: ${GREEN}${alb_status}${NC}) - 常時稼働"
        ((count++))
    fi
    
    # Check ECS Cluster (informational)
    cluster_status=$(get_resource_status "ecs-cluster" "$CLUSTER_NAME")
    if [[ "$cluster_status" == "ACTIVE" ]]; then
        echo -e "${count}. ECS Cluster: ${CLUSTER_NAME} (Status: ${GREEN}${cluster_status}${NC}) - 常時稼働"
        ((count++))
    fi
    
    # Check ECR Repositories (informational)
    ecr_backend_status=$(get_resource_status "ecr-repo" "$ECR_BACKEND")
    if [[ "$ecr_backend_status" != "NOT_FOUND" ]]; then
        echo -e "${count}. ECR Repository: ${ECR_BACKEND} (Status: ${BLUE}存在${NC}) - 常時利用可能"
        ((count++))
    fi
    
    ecr_frontend_status=$(get_resource_status "ecr-repo" "$ECR_FRONTEND")
    if [[ "$ecr_frontend_status" != "NOT_FOUND" ]]; then
        echo -e "${count}. ECR Repository: ${ECR_FRONTEND} (Status: ${BLUE}存在${NC}) - 常時利用可能"
        ((count++))
    fi
    
    echo ""
    
    if [[ ${#resources[@]} -eq 0 ]]; then
        echo -e "${GREEN}✅ 開始可能な停止中のリソースはありません。すべて実行中です。${NC}"
        return 1
    fi
    
    # Return arrays for use in main function
    # Use global variables for compatibility
    start_resource_count=${#resources[@]}
    for i in "${!resources[@]}"; do
        eval "start_resource_${i}=${resources[$i]}"
        eval "start_resource_type_${i}=${resource_types[$i]}"
        eval "start_resource_name_${i}=${resource_names[$i]}"
    done
    
    return 0
}

# Function to start ECS service
start_ecs_service() {
    local service_name=$1
    echo -e "${YELLOW}🔄 Starting ECS Service: ${service_name}...${NC}"
    
    # Start with desired count of 1
    local result=$(aws ecs update-service --cluster "$CLUSTER_NAME" --service "$service_name" --desired-count 1 --region "$REGION" 2>&1)
    local exit_code=$?
    
    if [ $exit_code -eq 0 ]; then
        echo -e "${GREEN}✅ Successfully started ECS Service: ${service_name}${NC}"
        echo -e "${BLUE}   Desired count set to 1. Service will scale up.${NC}"
        return 0
    else
        echo -e "${RED}❌ Failed to start ECS Service: ${service_name}${NC}"
        echo -e "${RED}   Error: ${result}${NC}"
        return 1
    fi
}

# Function to start RDS instance
start_rds_instance() {
    local instance_id=$1
    echo -e "${YELLOW}🔄 Starting RDS Instance: ${instance_id}...${NC}"
    
    local result=$(aws rds start-db-instance --db-instance-identifier "$instance_id" --region "$REGION" 2>&1)
    local exit_code=$?
    
    if [ $exit_code -eq 0 ]; then
        echo -e "${GREEN}✅ Successfully initiated start for RDS Instance: ${instance_id}${NC}"
        echo -e "${BLUE}ℹ️  RDS instance will take a few minutes to become available${NC}"
        return 0
    else
        echo -e "${RED}❌ Failed to start RDS Instance: ${instance_id}${NC}"
        echo -e "${RED}   Error: ${result}${NC}"
        return 1
    fi
}

# Function to wait for RDS to be available (optional)
wait_for_rds() {
    local instance_id=$1
    echo -e "${YELLOW}⏳ Waiting for RDS Instance to become available...${NC}"
    
    local timeout=300 # 5 minutes
    local counter=0
    
    while [ $counter -lt $timeout ]; do
        local status=$(get_resource_status "rds-instance" "$instance_id")
        if [[ "$status" == "available" ]]; then
            echo -e "${GREEN}✅ RDS Instance is now available${NC}"
            return 0
        fi
        
        echo -e "${BLUE}⏳ RDS Status: ${status} (waiting...)${NC}"
        sleep 30
        counter=$((counter + 30))
    done
    
    echo -e "${YELLOW}⚠️  Timeout waiting for RDS. Please check AWS console.${NC}"
    return 1
}

# Main execution
main() {
    echo -e "${BLUE}🔍 AWS CLIの確認中...${NC}"
    check_aws_cli
    echo -e "${GREEN}✅ AWS CLI確認完了${NC}"
    echo ""
    
    if ! list_startable_resources; then
        echo -e "${BLUE}終了しました${NC}"
        exit 0
    fi
    
    # User confirmation
    echo -e "${YELLOW}⚠️  開始してOKですか？ (y/N): ${NC}"
    read -r response
    
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        echo -e "${BLUE}❌ 操作をキャンセルしました${NC}"
        echo -e "${BLUE}終了しました${NC}"
        exit 0
    fi
    
    echo ""
    echo -e "${YELLOW}▶️ リソースの開始を開始します...${NC}"
    echo ""
    
    # Arrays to track results
    declare -a successful_starts=()
    declare -a failed_starts=()
    local rds_started=false
    
    # Start resources (RDS first, then ECS services)
    echo -e "${BLUE}🔍 Processing ${start_resource_count} resources (RDS first)...${NC}"
    for ((i=0; i<start_resource_count; i++)); do
        resource_type_var="start_resource_type_${i}"
        resource_name_var="start_resource_name_${i}"
        resource_type="${!resource_type_var}"
        resource_name="${!resource_name_var}"
        
        case $resource_type in
            "rds-instance")
                if start_rds_instance "$resource_name"; then
                    successful_starts+=("RDS Instance: $resource_name")
                    rds_started=true
                else
                    failed_starts+=("RDS Instance: $resource_name")
                fi
                ;;
        esac
    done
    
    # Wait for RDS if it was started
    if [[ "$rds_started" == true ]]; then
        echo ""
        echo -e "${BLUE}💡 RDSインスタンスの起動を待機中... (スキップするには Ctrl+C)${NC}"
        echo -e "${BLUE}ℹ️  ECSサービスはRDSの準備完了後に開始することを推奨します${NC}"
        echo ""
        if wait_for_rds "$RDS_INSTANCE"; then
            echo ""
        fi
    fi
    
    # Start ECS services
    echo -e "${BLUE}🔍 Starting ECS services...${NC}"
    for ((i=0; i<start_resource_count; i++)); do
        resource_type_var="start_resource_type_${i}"
        resource_name_var="start_resource_name_${i}"
        resource_type="${!resource_type_var}"
        resource_name="${!resource_name_var}"
        
        case $resource_type in
            "ecs-service")
                if start_ecs_service "$resource_name"; then
                    successful_starts+=("ECS Service: $resource_name")
                else
                    failed_starts+=("ECS Service: $resource_name")
                fi
                ;;
        esac
    done
    
    echo ""
    echo -e "${BLUE}==============================================================================${NC}"
    echo -e "${BLUE}📊 開始操作結果${NC}"
    echo -e "${BLUE}==============================================================================${NC}"
    
    if [[ ${#successful_starts[@]} -gt 0 ]]; then
        echo -e "${GREEN}✅ 成功した開始操作:${NC}"
        for item in "${successful_starts[@]}"; do
            echo -e "   • $item"
        done
        echo ""
    fi
    
    if [[ ${#failed_starts[@]} -gt 0 ]]; then
        echo -e "${RED}❌ 失敗した開始操作:${NC}"
        for item in "${failed_starts[@]}"; do
            echo -e "   • $item"
        done
        echo ""
    fi
    
    if [[ ${#failed_starts[@]} -eq 0 ]]; then
        echo -e "${GREEN}🎉 すべてのリソースの開始操作が正常に完了しました！${NC}"
        echo ""
        echo -e "${BLUE}📋 アプリケーションURL:${NC}"
        
        # Get ALB DNS name
        alb_dns=$(aws elbv2 describe-load-balancers --names "$ALB_NAME" --region "$REGION" --query 'LoadBalancers[0].DNSName' --output text 2>/dev/null || echo "取得できませんでした")
        if [[ "$alb_dns" != "取得できませんでした" ]]; then
            echo -e "${GREEN}🌐 http://${alb_dns}${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  一部のリソースの開始に失敗しました。AWSコンソールで確認してください。${NC}"
    fi
    
    echo ""
    echo -e "${BLUE}📝 注意: ECSサービスが完全に起動するまで数分かかる場合があります。${NC}"
    echo -e "${BLUE}終了しました${NC}"
}

# Run main function
main "$@" 
