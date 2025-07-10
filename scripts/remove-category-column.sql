-- 本番環境用: カテゴリカラム削除マイグレーション
-- Issue #27: カテゴリ機能の削除

-- 安全のためのバックアップ推奨
-- mysqldump -u splitmate_user -p splitmate_database > backup_before_category_removal.sql

-- expensesテーブルからcategoryカラムを削除
ALTER TABLE expenses DROP COLUMN IF EXISTS category;

-- 確認用クエリ
SELECT 
  COLUMN_NAME, 
  DATA_TYPE, 
  IS_NULLABLE, 
  COLUMN_DEFAULT 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'splitmate' 
  AND TABLE_NAME = 'expenses' 
ORDER BY ORDINAL_POSITION; 
