# Terraform変数の定義
variable "google_client_id" {
  description = "Google OAuth Client ID"
  type        = string
  sensitive   = true
}

variable "google_client_secret" {
  description = "Google OAuth Client Secret"
  type        = string
  sensitive   = true
}

variable "session_secret" {
  description = "Session secret for authentication"
  type        = string
  sensitive   = true
  default     = "your-production-session-secret-change-this"
}

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 4.0"
    }
  }
  required_version = ">= 1.0.0"
}

provider "aws" {
  region = "ap-northeast-1"
}

resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true
  tags = {
    Name = "splitmate-vpc"
  }
}

resource "aws_subnet" "main" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.1.0/24"
  availability_zone       = "ap-northeast-1a"
  map_public_ip_on_launch = true
  tags = {
    Name = "splitmate-subnet-1a"
  }
}

resource "aws_subnet" "main_2" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.2.0/24"
  availability_zone       = "ap-northeast-1c"
  map_public_ip_on_launch = true
  tags = {
    Name = "splitmate-subnet-1c"
  }
}

# Internet Gateway
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id
  tags = {
    Name = "splitmate-igw"
  }
}

# Route Table
resource "aws_route_table" "main" {
  vpc_id = aws_vpc.main.id
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }
  tags = {
    Name = "splitmate-rt"
  }
}

# Route Table Association
resource "aws_route_table_association" "main" {
  subnet_id      = aws_subnet.main.id
  route_table_id = aws_route_table.main.id
}

resource "aws_route_table_association" "main_2" {
  subnet_id      = aws_subnet.main_2.id
  route_table_id = aws_route_table.main.id
}

resource "aws_security_group" "db" {
  name        = "splitmate-db-sg"
  description = "Allow MySQL access"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port   = 3306
    to_port     = 3306
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"] # 開発用。運用時は制限推奨
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_db_subnet_group" "main" {
  name = "splitmate-db-subnet-group"
  subnet_ids = [
    aws_subnet.main.id,
    aws_subnet.main_2.id,
    aws_subnet.private_1.id,
    aws_subnet.private_2.id
  ]

  tags = {
    Name = "splitmate-db-subnet-group"
  }
}

resource "aws_db_instance" "mysql" {
  allocated_storage      = 20
  engine                 = "mysql"
  engine_version         = "8.0"
  instance_class         = "db.t3.micro"
  identifier             = "splitmate-mysql"
  username               = "splitmate_user"
  password               = "splitmate-rds"
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.db.id]

  skip_final_snapshot = true
  publicly_accessible = true
  apply_immediately   = true
  tags = {
    Name = "splitmate-mysql"
  }
  depends_on = [
    aws_internet_gateway.main,
    aws_route_table_association.main,
    aws_route_table_association.main_2
  ]
}

# ECR Repository for Backend
resource "aws_ecr_repository" "backend" {
  name                 = "splitmate-backend"
  image_tag_mutability = "MUTABLE"
  force_delete         = true

  image_scanning_configuration {
    scan_on_push = true
  }
}

# ECR Repository for Frontend
resource "aws_ecr_repository" "frontend" {
  name                 = "splitmate-frontend"
  image_tag_mutability = "MUTABLE"
  force_delete         = true

  image_scanning_configuration {
    scan_on_push = true
  }
}

# ECS Cluster
resource "aws_ecs_cluster" "main" {
  name = "splitmate-cluster"
}

# Security Group for ECS
resource "aws_security_group" "ecs" {
  name        = "splitmate-ecs-sg"
  description = "Allow HTTP access to ECS from ALB"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port       = 3000
    to_port         = 3000
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  ingress {
    from_port       = 3000
    to_port         = 3000
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# IAM Role for ECS Task Execution
resource "aws_iam_role" "ecs_task_execution_role" {
  name = "splitmate-ecs-task-execution-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_task_execution_role_policy" {
  role       = aws_iam_role.ecs_task_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# ECS Task Definition for Backend
resource "aws_ecs_task_definition" "backend" {
  family                   = "splitmate-backend"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = 256
  memory                   = 512
  execution_role_arn       = aws_iam_role.ecs_task_execution_role.arn

  container_definitions = jsonencode([
    {
      name  = "backend"
      image = "${aws_ecr_repository.backend.repository_url}:latest"
      portMappings = [
        {
          containerPort = 3000
          protocol      = "tcp"
        }
      ]
      environment = [
        {
          name  = "DB_HOST"
          value = aws_db_instance.mysql.address
        },
        {
          name  = "DB_USER"
          value = "splitmate_user"
        },
        {
          name  = "DB_PASSWORD"
          value = "splitmate-rds"
        },
        {
          name  = "DB_NAME"
          value = "splitmate"
        },
        {
          name  = "DB_PORT"
          value = "3306"
        },
        {
          name  = "PORT"
          value = "3000"
        },
        {
          name  = "NODE_ENV"
          value = "production"
        },
        {
          name  = "FRONTEND_URL"
          value = "http://${aws_lb.main.dns_name}"
        },
        {
          name  = "GOOGLE_CLIENT_ID"
          value = var.google_client_id
        },
        {
          name  = "GOOGLE_CLIENT_SECRET"
          value = var.google_client_secret
        },
        {
          name  = "GOOGLE_CALLBACK_URL"
          value = "http://${aws_lb.main.dns_name}/auth/google/callback"
        },
        {
          name  = "SESSION_SECRET"
          value = var.session_secret
        }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          awslogs-group         = "/ecs/splitmate-backend"
          awslogs-region        = "ap-northeast-1"
          awslogs-stream-prefix = "ecs"
        }
      }
    }
  ])
}

# ECS Service for Backend
resource "aws_ecs_service" "backend" {
  name            = "splitmate-backend-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.backend.arn
  desired_count   = 1
  launch_type     = "FARGATE"


  network_configuration {
    subnets          = [aws_subnet.main.id, aws_subnet.main_2.id]
    security_groups  = [aws_security_group.ecs.id]
    assign_public_ip = true
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.backend.arn
    container_name   = "backend"
    container_port   = 3000
  }
}

# CloudWatch Log Groups - Commented out due to permission issues
# resource "aws_cloudwatch_log_group" "backend" {
#   name              = "/ecs/splitmate-backend"
#   retention_in_days = 7
#   skip_destroy      = true
# }

# resource "aws_cloudwatch_log_group" "frontend" {
#   name              = "/ecs/splitmate-frontend"
#   retention_in_days = 7
#   skip_destroy      = true
# }

# Application Load Balancer
resource "aws_lb" "main" {
  name               = "splitmate-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = [aws_subnet.main.id, aws_subnet.main_2.id]

  enable_deletion_protection = false

  tags = {
    Name = "splitmate-alb"
  }
}

# Security Group for ALB
resource "aws_security_group" "alb" {
  name        = "splitmate-alb-sg"
  description = "Allow HTTP/HTTPS access to ALB"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# Target Group for Backend
resource "aws_lb_target_group" "backend" {
  name        = "splitmate-backend-tg"
  port        = 3000
  protocol    = "HTTP"
  vpc_id      = aws_vpc.main.id
  target_type = "ip"

  health_check {
    enabled             = true
    healthy_threshold   = 2
    interval            = 30
    matcher             = "200"
    path                = "/health"
    port                = "traffic-port"
    protocol            = "HTTP"
    timeout             = 5
    unhealthy_threshold = 2
  }
}

# Target Group for Frontend
resource "aws_lb_target_group" "frontend" {
  name        = "splitmate-frontend-tg"
  port        = 3000
  protocol    = "HTTP"
  vpc_id      = aws_vpc.main.id
  target_type = "ip"

  health_check {
    enabled             = true
    healthy_threshold   = 2
    interval            = 30
    matcher             = "200"
    path                = "/"
    port                = "traffic-port"
    protocol            = "HTTP"
    timeout             = 5
    unhealthy_threshold = 2
  }
}

# ALB Listener for HTTP
resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main.arn
  port              = "80"
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.frontend.arn
  }
}

# /api/* → backend ルール
resource "aws_lb_listener_rule" "api" {
  listener_arn = aws_lb_listener.http.arn
  priority     = 10

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.backend.arn
  }

  condition {
    path_pattern {
      values = ["/api/*"]
    }
  }
}

# /auth/google と /auth/google/* → backend ルール (Google OAuth認証用)
resource "aws_lb_listener_rule" "auth_google" {
  listener_arn = aws_lb_listener.http.arn
  priority     = 20

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.backend.arn
  }

  condition {
    path_pattern {
      values = ["/auth/google", "/auth/google/*"]
    }
  }
}

# /auth/status → backend ルール (認証状態確認用)
resource "aws_lb_listener_rule" "auth_status" {
  listener_arn = aws_lb_listener.http.arn
  priority     = 21

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.backend.arn
  }

  condition {
    path_pattern {
      values = ["/auth/status"]
    }
  }
}

# /auth/logout → backend ルール (ログアウト用)
resource "aws_lb_listener_rule" "auth_logout" {
  listener_arn = aws_lb_listener.http.arn
  priority     = 22

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.backend.arn
  }

  condition {
    path_pattern {
      values = ["/auth/logout"]
    }
  }
}

# /health → backend ルール (ヘルスチェック用)
resource "aws_lb_listener_rule" "health" {
  listener_arn = aws_lb_listener.http.arn
  priority     = 30

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.backend.arn
  }

  condition {
    path_pattern {
      values = ["/health"]
    }
  }
}

# ECS Task Definition for Frontend
resource "aws_ecs_task_definition" "frontend" {
  family                   = "splitmate-frontend"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = 256
  memory                   = 512
  execution_role_arn       = aws_iam_role.ecs_task_execution_role.arn

  container_definitions = jsonencode([
    {
      name  = "frontend"
      image = "${aws_ecr_repository.frontend.repository_url}:latest"
      portMappings = [
        {
          containerPort = 3000
          protocol      = "tcp"
        }
      ]
      environment = [
        {
          name  = "VITE_API_URL"
          value = "http://${aws_lb.main.dns_name}"
        }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          awslogs-group         = "/ecs/splitmate-frontend"
          awslogs-region        = "ap-northeast-1"
          awslogs-stream-prefix = "ecs"
        }
      }
    }
  ])
}

# ECS Service for Frontend
resource "aws_ecs_service" "frontend" {
  name            = "splitmate-frontend-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.frontend.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = [aws_subnet.main.id, aws_subnet.main_2.id]
    security_groups  = [aws_security_group.ecs.id]
    assign_public_ip = true
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.frontend.arn
    container_name   = "frontend"
    container_port   = 3000
  }

  depends_on = [aws_lb_listener.http]
}

# プライベートサブネットの追加
resource "aws_subnet" "private_1" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.3.0/24"
  availability_zone = "ap-northeast-1a"

  tags = {
    Name = "splitmate-private-1"
  }
}

resource "aws_subnet" "private_2" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.4.0/24"
  availability_zone = "ap-northeast-1c"

  tags = {
    Name = "splitmate-private-2"
  }
}

# NAT Gateway用のElastic IP
resource "aws_eip" "nat" {
  domain = "vpc"
  tags = {
    Name = "splitmate-nat"
  }
}

# NAT Gateway
resource "aws_nat_gateway" "main" {
  allocation_id = aws_eip.nat.id
  subnet_id     = aws_subnet.main.id

  tags = {
    Name = "splitmate-nat"
  }
}

# プライベートサブネット用のルートテーブル
resource "aws_route_table" "private" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.main.id
  }

  tags = {
    Name = "splitmate-private"
  }
}

# プライベートサブネットとルートテーブルの関連付け
resource "aws_route_table_association" "private_1" {
  subnet_id      = aws_subnet.private_1.id
  route_table_id = aws_route_table.private.id
}

resource "aws_route_table_association" "private_2" {
  subnet_id      = aws_subnet.private_2.id
  route_table_id = aws_route_table.private.id
}
