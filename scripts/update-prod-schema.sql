-- 本番環境のデータベーススキーマ更新スクリプト
-- expense_year と expense_month カラムを追加

-- 既存のテーブルにカラムを追加
ALTER TABLE expenses 
ADD COLUMN expense_year INT NOT NULL DEFAULT YEAR(NOW()),
ADD COLUMN expense_month INT NOT NULL DEFAULT MONTH(NOW());

-- 制約を追加
ALTER TABLE expenses 
ADD CONSTRAINT check_expense_year CHECK (expense_year >= 2020 AND expense_year <= 2099),
ADD CONSTRAINT check_expense_month CHECK (expense_month >= 1 AND expense_month <= 12);

-- 既存のデータを現在の年月で更新
UPDATE expenses 
SET expense_year = YEAR(created_at), 
    expense_month = MONTH(created_at) 
WHERE expense_year IS NULL OR expense_month IS NULL;

-- インデックスを追加
CREATE INDEX idx_expenses_monthly ON expenses(expense_year, expense_month);
CREATE INDEX idx_expenses_monthly_payer ON expenses(expense_year, expense_month, payer_id);

-- 確認用クエリ
SELECT 'Schema update completed' as status;
DESCRIBE expenses; 
