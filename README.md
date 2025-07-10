# What is splitmate?
Household Expense Settlement System.
This document is requirements document.

## Purpose
To streamline and automate the monthly household expense settlement process between spouses, reducing manual effort and human error while improving clarity and efficiency.

## Users

- **Husband**: Settlement handler (currently manages the processing)
- **Wife**: Settlement requester (provides receipts)
**Note:** The roles of “settlement handler” and “settlement requester” are interchangeable. Either the husband or the wife can take on these roles as needed.
## Expense Entry Items
| Field       | Description          | Required | Example   |
| ----------- | -------------------- | -------- | --------- |
| Category    | Type of expense      | Yes      | Groceries |
| Description | Store or detail name | Yes      | Maruetsu  |
| Amount      | Expense amount       | Yes      | 3,000 yen |
## System Components
- Screen Z: Allocation Ratio Settings
- Function: Set and save the expense allocation ratio between spouses
  - Example default: Husband 0.7 / Wife 0.3
## Screen A: Expense Entry
Inputs:
- Category (selectable)
- Description (text input)
- Amount (numeric input)
Users: Husband or Wife
Button: "Complete Entry"
## Settlement Logic
- Apply predefined allocation ratios to the registered expenses
- Calculate each person’s share of the expenses
- Automatically determine:
  - Who pays
  - Who receives
  - Settlement amount (difference)
## Notification & Approval Process (via LINE)
### Step 1: Confirmation Notification
After both parties complete their entries, send the following via LINE:
```
[Household Settlement Details]
Category: Groceries
Description: Maruetsu
Amount: 3,000 yen
(Allocation: Husband 2,100 yen / Wife 900 yen)

▼ Please confirm ▼
[OK Button]
```
### Step 2: Mutual Approval
Once both press "OK", send:
To the paying party:
```
Please transfer xxx yen by yyy.
```
To the receiving party:
```
xxx yen will be transferred by yyy.
If not transferred by then, reminders will be sent every z days.
You can adjust z (reminder interval) from this message.
```
### Default Settings
| Item                   | Value                    |
| ---------------------- | ------------------------ |
| Settlement Deadline    | 7 days from confirmation |
| Reminder Frequency (z) | Every 1 day              |

Both parties will be informed about the reminder interval (z) the first time and can change it.

## AWS Resource Management

This project includes scripts to manage AWS resources efficiently, allowing you to start and stop infrastructure components to optimize costs.

### Available Scripts

#### Stop AWS Resources
```bash
./scripts/stop-aws-resources.sh
```
- **Purpose**: Stop AWS resources to reduce costs while preserving data
- **Targets**: ECS Services, RDS Instance (keeps data for restart)
- **Features**: 
  - Lists all running resources numerically
  - User confirmation prompt ("停止してOKですか?" y/N)
  - Error handling with success/failure reporting
  - Preserves database data for restart capability

#### Start AWS Resources
```bash
./scripts/start-aws-resources.sh
```
- **Purpose**: Start stopped AWS resources to restore application functionality
- **Targets**: RDS Instance, ECS Services
- **Features**:
  - Lists all startable resources numerically
  - User confirmation prompt ("開始してOKですか?" y/N)
  - Error handling with success/failure reporting
  - Automatic RDS availability waiting
  - Displays application URL upon successful completion

### Resource Types Managed
1. **ECS Cluster**: `splitmate-cluster`
2. **ECS Services**: 
   - Backend Service: `splitmate-backend-service`
   - Frontend Service: `splitmate-frontend-service`
3. **RDS Instance**: `splitmate-mysql` (data preserved during stop/start)
4. **Application Load Balancer**: `splitmate-alb` (always active)
5. **ECR Repositories**: `splitmate-backend`, `splitmate-frontend` (always available)

### Prerequisites
- AWS CLI installed and configured
- Appropriate AWS permissions for ECS, RDS, and ELB operations
- Resources must be deployed via Terraform first

### Usage Notes
- **Data Safety**: Database data is preserved during stop/start operations
- **Startup Order**: RDS starts first, then ECS services (recommended)
- **Cost Optimization**: Only compute resources (ECS, RDS) are stopped; storage and networking remain
- **Availability**: Application typically takes 2-5 minutes to become fully operational after start
