# SplitMate Implementation Summary

## プロジェクト概要
SplitMateは夫婦間の家計費精算システムです。以下の機能が実装されています：

## 現在実装済みの機能

### 1. 認証システム
- Google OAuth 2.0による認証機能
- セッション管理
- ユーザーメニュー

### 2. 費用管理機能
- **費用入力フォーム** (`ExpenseForm.tsx`)
  - 説明（店舗名など）
  - 金額
  - カテゴリ機能は削除済み（最新コミット: 7f6a40d）

- **費用一覧表示** (`ExpenseList.tsx`)
  - 全費用表示
  - 月次費用表示（年月選択可能）
  - 一括削除機能
  - 個別削除機能

- **費用統計** (`ExpenseStats.tsx`)
  - 総費用数
  - 総金額
  - 最小金額
  - 平均・最大額は削除済み（コミット: e6adcac, 210a733）

### 3. 配分比率設定機能
- **配分比率フォーム** (`AllocationRatioForm.tsx`)
- 夫婦間の費用負担割合を設定
- カスタム配分比率対応（最新の本番データベース移行対応済み）

### 4. 精算管理機能
- **精算リスト** (`SettlementList.tsx`)
- 費用に基づく自動精算計算
- 精算方向表示の修正済み（Issue #39, コミット: 7c61379）
- 配分比率制御の強化（Issue #29, コミット: 38ac8b5）

### 5. バックエンドAPI
- **MySQL対応** (`index-mysql.ts`)
- Express.js + TypeScript
- 以下のAPIエンドポイント:
  - `/api/expenses` - 費用管理
  - `/api/allocation-ratio` - 配分比率
  - `/api/settlements` - 精算管理
  - `/auth/*` - Google OAuth認証

### 6. インフラ構成
- **Docker対応**
  - 開発用: `docker-compose.dev.yml`
  - 本番用: `docker-compose.yml`
- **AWS デプロイメント**
  - ECS + ALB + RDS MySQL
  - コスト最適化スクリプト (`scripts/stop-aws-resources.sh`, `scripts/start-aws-resources.sh`)

### 7. フロントエンド技術スタック
- React 18 + TypeScript
- Vite
- React Router v7
- Tailwind CSS
- Axios

## 最近の重要な変更

1. **カテゴリ機能の完全削除** (コミット: 7f6a40d)
2. **精算方向表示の修正** (Issue #39)
3. **データベースプール管理の修正** (Issue #38 - "Pool is closed"エラー解決)
4. **本番データベース移行** - カスタム配分比率フィールド追加
5. **TypeScriptタイマー型の修正** (本番ビルド対応)

## プロジェクト構成
```
splitmate/
├── frontend/          # React + TypeScript
├── backend/           # Express + TypeScript + MySQL
├── scripts/           # AWS リソース管理スクリプト
├── infra/             # Terraform等のインフラコード
├── docs/              # ドキュメント
└── docker-compose.*   # Docker設定
```

## 開発状況
プロジェクトは活発に開発中で、最新の変更では要件に基づいてカテゴリ機能の削除、精算機能の強化、本番環境対応などが実装されています。