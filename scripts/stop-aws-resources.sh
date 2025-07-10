#!/bin/bash

# =============================================================================
# AWS Resources Stop Script for SplitMate
# =============================================================================
# Issue #33: AWS Resource Management Scripts
# Stops AWS resources while preserving database data for restart capability
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
echo -e "${BLUE}🛑 AWS Resources Stop Script for SplitMate${NC}"
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
            aws ecs describe-services --cluster "$CLUSTER_NAME" --services "$resource_name" --region "$REGION" --query 'services[0].status' --output text 2>/dev/null || echo "NOT_FOUND"
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

# Function to list AWS resources
list_running_resources() {
    echo -e "${YELLOW}📋 現在実行中のAWSリソース:${NC}"
    echo ""
    
    local count=1
    declare -a resources=()
    declare -a resource_types=()
    declare -a resource_names=()
    
    # Check ECS Services
    backend_status=$(get_resource_status "ecs-service" "$BACKEND_SERVICE")
    if [[ "$backend_status" == "ACTIVE" ]]; then
        echo -e "${count}. ECS Service: ${BACKEND_SERVICE} (Status: ${GREEN}${backend_status}${NC})"
        resources+=("$count")
        resource_types+=("ecs-service")
        resource_names+=("$BACKEND_SERVICE")
        ((count++))
    fi
    
    frontend_status=$(get_resource_status "ecs-service" "$FRONTEND_SERVICE")
    if [[ "$frontend_status" == "ACTIVE" ]]; then
        echo -e "${count}. ECS Service: ${FRONTEND_SERVICE} (Status: ${GREEN}${frontend_status}${NC})"
        resources+=("$count")
        resource_types+=("ecs-service")
        resource_names+=("$FRONTEND_SERVICE")
        ((count++))
    fi
    
    # Check RDS Instance
    rds_status=$(get_resource_status "rds-instance" "$RDS_INSTANCE")
    if [[ "$rds_status" == "available" ]]; then
        echo -e "${count}. RDS Instance: ${RDS_INSTANCE} (Status: ${GREEN}${rds_status}${NC})"
        resources+=("$count")
        resource_types+=("rds-instance")
        resource_names+=("$RDS_INSTANCE")
        ((count++))
    fi
    
    # Check ALB
    alb_status=$(get_resource_status "alb" "$ALB_NAME")
    if [[ "$alb_status" == "active" ]]; then
        echo -e "${count}. Application Load Balancer: ${ALB_NAME} (Status: ${GREEN}${alb_status}${NC})"
        resources+=("$count")
        resource_types+=("alb")
        resource_names+=("$ALB_NAME")
        ((count++))
    fi
    
    # Check ECS Cluster (only if it has running services)
    if [[ "$backend_status" == "ACTIVE" ]] || [[ "$frontend_status" == "ACTIVE" ]]; then
        cluster_status=$(get_resource_status "ecs-cluster" "$CLUSTER_NAME")
        if [[ "$cluster_status" == "ACTIVE" ]]; then
            echo -e "${count}. ECS Cluster: ${CLUSTER_NAME} (Status: ${GREEN}${cluster_status}${NC})"
            resources+=("$count")
            resource_types+=("ecs-cluster")
            resource_names+=("$CLUSTER_NAME")
            ((count++))
        fi
    fi
    
    # Check ECR Repositories (always listed as they don't have start/stop)
    ecr_backend_status=$(get_resource_status "ecr-repo" "$ECR_BACKEND")
    if [[ "$ecr_backend_status" != "NOT_FOUND" ]]; then
        echo -e "${count}. ECR Repository: ${ECR_BACKEND} (Status: ${BLUE}存在${NC}) - データ保持のため停止対象外"
        ((count++))
    fi
    
    ecr_frontend_status=$(get_resource_status "ecr-repo" "$ECR_FRONTEND")
    if [[ "$ecr_frontend_status" != "NOT_FOUND" ]]; then
        echo -e "${count}. ECR Repository: ${ECR_FRONTEND} (Status: ${BLUE}存在${NC}) - データ保持のため停止対象外"
        ((count++))
    fi
    
    echo ""
    
    if [[ ${#resources[@]} -eq 0 ]]; then
        echo -e "${YELLOW}⚠️  停止可能な実行中のリソースはありません。${NC}"
        return 1
    fi
    
    # Return arrays for use in main function
    # Use global variables without declare -g for compatibility
    stop_resource_count=${#resources[@]}
    for i in "${!resources[@]}"; do
        eval "stop_resource_${i}=${resources[$i]}"
        eval "stop_resource_type_${i}=${resource_types[$i]}"
        eval "stop_resource_name_${i}=${resource_names[$i]}"
    done
    
    return 0
}

# Function to stop ECS service
stop_ecs_service() {
    local service_name=$1
    echo -e "${YELLOW}🔄 Stopping ECS Service: ${service_name}...${NC}"
    
    local result=$(aws ecs update-service --cluster "$CLUSTER_NAME" --service "$service_name" --desired-count 0 --region "$REGION" 2>&1)
    local exit_code=$?
    
    if [ $exit_code -eq 0 ]; then
        echo -e "${GREEN}✅ Successfully stopped ECS Service: ${service_name}${NC}"
        echo -e "${BLUE}   Desired count set to 0. Service will scale down.${NC}"
        return 0
    else
        echo -e "${RED}❌ Failed to stop ECS Service: ${service_name}${NC}"
        echo -e "${RED}   Error: ${result}${NC}"
        return 1
    fi
}

# Function to stop RDS instance
stop_rds_instance() {
    local instance_id=$1
    echo -e "${YELLOW}🔄 Stopping RDS Instance: ${instance_id}...${NC}"
    
    local result=$(aws rds stop-db-instance --db-instance-identifier "$instance_id" --region "$REGION" 2>&1)
    local exit_code=$?
    
    if [ $exit_code -eq 0 ]; then
        echo -e "${GREEN}✅ Successfully initiated stop for RDS Instance: ${instance_id}${NC}"
        echo -e "${BLUE}   RDS instance will stop in a few minutes.${NC}"
        return 0
    else
        echo -e "${RED}❌ Failed to stop RDS Instance: ${instance_id}${NC}"
        echo -e "${RED}   Error: ${result}${NC}"
        return 1
    fi
}

# Function to stop ALB (actually just report it can't be stopped)
stop_alb() {
    local alb_name=$1
    echo -e "${YELLOW}🔄 Checking ALB: ${alb_name}...${NC}"
    echo -e "${BLUE}ℹ️  ALB cannot be stopped but will become inactive when ECS services stop${NC}"
    return 0
}

# Main execution
main() {
    echo -e "${BLUE}🔍 AWS CLIの確認中...${NC}"
    check_aws_cli
    echo -e "${GREEN}✅ AWS CLI確認完了${NC}"
    echo ""
    
    if ! list_running_resources; then
        echo -e "${BLUE}終了しました${NC}"
        exit 0
    fi
    
    # User confirmation
    echo -e "${YELLOW}⚠️  停止してOKですか？ (y/N): ${NC}"
    read -r response
    
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        echo -e "${BLUE}❌ 操作をキャンセルしました${NC}"
        echo -e "${BLUE}終了しました${NC}"
        exit 0
    fi
    
    echo ""
    echo -e "${YELLOW}🛑 リソースの停止を開始します...${NC}"
    echo ""
    
    # Arrays to track results
    declare -a successful_stops=()
    declare -a failed_stops=()
    
    # Stop resources
    echo -e "${BLUE}🔍 Processing ${stop_resource_count} resources...${NC}"
    for ((i=0; i<stop_resource_count; i++)); do
        resource_type_var="stop_resource_type_${i}"
        resource_name_var="stop_resource_name_${i}"
        resource_type="${!resource_type_var}"
        resource_name="${!resource_name_var}"
        
        echo -e "${BLUE}📍 Processing: ${resource_type} - ${resource_name}${NC}"
        
        case $resource_type in
            "ecs-service")
                if stop_ecs_service "$resource_name"; then
                    successful_stops+=("ECS Service: $resource_name")
                else
                    failed_stops+=("ECS Service: $resource_name")
                fi
                ;;
            "rds-instance")
                if stop_rds_instance "$resource_name"; then
                    successful_stops+=("RDS Instance: $resource_name")
                else
                    failed_stops+=("RDS Instance: $resource_name")
                fi
                ;;
            "alb")
                if stop_alb "$resource_name"; then
                    successful_stops+=("ALB: $resource_name (checked)")
                else
                    failed_stops+=("ALB: $resource_name")
                fi
                ;;
            "ecs-cluster")
                # ECS Cluster will become inactive when services stop
                successful_stops+=("ECS Cluster: $resource_name (will become inactive)")
                ;;
        esac
    done
    
    echo ""
    echo -e "${BLUE}==============================================================================${NC}"
    echo -e "${BLUE}📊 停止操作結果${NC}"
    echo -e "${BLUE}==============================================================================${NC}"
    
    if [[ ${#successful_stops[@]} -gt 0 ]]; then
        echo -e "${GREEN}✅ 成功した停止操作:${NC}"
        for item in "${successful_stops[@]}"; do
            echo -e "   • $item"
        done
        echo ""
    fi
    
    if [[ ${#failed_stops[@]} -gt 0 ]]; then
        echo -e "${RED}❌ 失敗した停止操作:${NC}"
        for item in "${failed_stops[@]}"; do
            echo -e "   • $item"
        done
        echo ""
    fi
    
    if [[ ${#failed_stops[@]} -eq 0 ]]; then
        echo -e "${GREEN}🎉 すべてのリソースの停止操作が正常に完了しました！${NC}"
    else
        echo -e "${YELLOW}⚠️  一部のリソースの停止に失敗しました。AWSコンソールで確認してください。${NC}"
    fi
    
    echo ""
    echo -e "${BLUE}📝 注意: RDSインスタンスのデータは保持され、再起動時に利用可能です。${NC}"
    echo -e "${BLUE}終了しました${NC}"
}

# Run main function
main "$@" 
