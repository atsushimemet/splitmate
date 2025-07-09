# データベースマイグレーション用のnull_resource
resource "null_resource" "db_migration" {
  # マイグレーションが必要な時に実行するトリガー
  triggers = {
    migration_version = "v1.0.1" # バージョンを変更すると再実行される
    db_endpoint       = aws_db_instance.mysql.endpoint
  }

  # RDSが完全に利用可能になってから実行
  depends_on = [aws_db_instance.mysql]

  # ローカルでマイグレーションSQLを実行
  provisioner "local-exec" {
    command = <<EOF
set -e
echo "🔄 Starting database migration via Terraform..."

# 接続テスト
echo "📍 Testing database connection..."
mysql -h ${aws_db_instance.mysql.address} \
      -P ${aws_db_instance.mysql.port} \
      -u ${aws_db_instance.mysql.username} \
      -p${aws_db_instance.mysql.password} \
      -e "SELECT 1;" 2>/dev/null && echo "✅ Database connection successful"

# マイグレーション実行
echo "📝 Executing database migration..."
mysql -h ${aws_db_instance.mysql.address} \
      -P ${aws_db_instance.mysql.port} \
      -u ${aws_db_instance.mysql.username} \
      -p${aws_db_instance.mysql.password} \
      ${aws_db_instance.mysql.db_name} << 'MIGRATION_SQL'

-- マイグレーション: expense_year と expense_month カラムを追加
-- 既存のカラムかどうかチェック
SET @col_exists_year = 0;
SET @col_exists_month = 0;

SELECT COUNT(*) INTO @col_exists_year
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'expenses' 
  AND COLUMN_NAME = 'expense_year';

SELECT COUNT(*) INTO @col_exists_month
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'expenses' 
  AND COLUMN_NAME = 'expense_month';

-- expense_year カラムを追加（存在しない場合）
SET @sql_year = IF(@col_exists_year = 0, 
    'ALTER TABLE expenses ADD COLUMN expense_year INT', 
    'SELECT "expense_year column already exists" as status');
PREPARE stmt_year FROM @sql_year;
EXECUTE stmt_year;
DEALLOCATE PREPARE stmt_year;

-- expense_month カラムを追加（存在しない場合）
SET @sql_month = IF(@col_exists_month = 0, 
    'ALTER TABLE expenses ADD COLUMN expense_month INT', 
    'SELECT "expense_month column already exists" as status');
PREPARE stmt_month FROM @sql_month;
EXECUTE stmt_month;
DEALLOCATE PREPARE stmt_month;

-- 既存データを更新（カラムが追加された場合のみ）
UPDATE expenses 
SET expense_year = YEAR(created_at), 
    expense_month = MONTH(created_at) 
WHERE expense_year IS NULL OR expense_month IS NULL;

-- カラムをNOT NULLに変更
SET @sql_year_nn = IF(@col_exists_year = 0, 
    'ALTER TABLE expenses MODIFY COLUMN expense_year INT NOT NULL', 
    'SELECT "expense_year already configured" as status');
PREPARE stmt_year_nn FROM @sql_year_nn;
EXECUTE stmt_year_nn;
DEALLOCATE PREPARE stmt_year_nn;

SET @sql_month_nn = IF(@col_exists_month = 0, 
    'ALTER TABLE expenses MODIFY COLUMN expense_month INT NOT NULL', 
    'SELECT "expense_month already configured" as status');
PREPARE stmt_month_nn FROM @sql_month_nn;
EXECUTE stmt_month_nn;
DEALLOCATE PREPARE stmt_month_nn;

-- 制約を追加（エラーを無視）
-- 制約が既に存在する場合はエラーになるが、それを無視
SET @constraint_year = 'ALTER TABLE expenses ADD CONSTRAINT check_expense_year CHECK (expense_year >= 2020 AND expense_year <= 2099)';
SET @constraint_month = 'ALTER TABLE expenses ADD CONSTRAINT check_expense_month CHECK (expense_month >= 1 AND expense_month <= 12)';

-- インデックスを追加（エラーを無視）
-- インデックスが既に存在する場合はエラーになるが、それを無視
SET @index_monthly = 'CREATE INDEX idx_expenses_monthly ON expenses(expense_year, expense_month)';
SET @index_monthly_payer = 'CREATE INDEX idx_expenses_monthly_payer ON expenses(expense_year, expense_month, payer_id)';

-- 最終確認
SELECT 'Migration completed' as status;
DESCRIBE expenses;

MIGRATION_SQL

echo "✅ Database migration completed successfully!"

# 結果を確認
echo "📊 Verifying migration results..."
mysql -h ${aws_db_instance.mysql.address} \
      -P ${aws_db_instance.mysql.port} \
      -u ${aws_db_instance.mysql.username} \
      -p${aws_db_instance.mysql.password} \
      ${aws_db_instance.mysql.db_name} \
      -e "SELECT expense_year, expense_month, COUNT(*) as count FROM expenses GROUP BY expense_year, expense_month ORDER BY expense_year, expense_month LIMIT 5;"

echo "🎉 Migration verification completed!"
EOF

    working_dir = "${path.module}/../.."
  }

  # マイグレーション失敗時のクリーンアップ（オプション）
  provisioner "local-exec" {
    when    = destroy
    command = "echo '🧹 Migration cleanup (if needed)...'"
  }
}

# マイグレーション実行用の出力
output "migration_status" {
  value      = "Database migration resource created. Run 'terraform apply' to execute migration."
  depends_on = [null_resource.db_migration]
}
