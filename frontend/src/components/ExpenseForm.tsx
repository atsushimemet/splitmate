import React, { forwardRef, memo, useImperativeHandle, useState } from 'react';
import { CreateExpenseRequest } from '../types';

interface ExpenseFormProps {
  onSubmit: (data: CreateExpenseRequest) => void;
  isLoading?: boolean;
}

export interface ExpenseFormHandle {
  resetAmountOnly: () => void;
  resetAll: () => void;
}

const EXPENSE_CATEGORIES = [
  '食費',
  '日用品',
  '交通費',
  '光熱費',
  '通信費',
  '医療費',
  '教育費',
  '娯楽費',
  '衣類費',
  'その他'
];

const DEFAULT_USERS = [
  { id: 'husband-001', name: '夫', role: 'husband' as const },
  { id: 'wife-001', name: '妻', role: 'wife' as const }
];

// 年月の選択肢を生成
const generateYearOptions = () => {
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let year = currentYear - 2; year <= currentYear + 1; year++) {
    years.push(year);
  }
  return years;
};

const MONTH_OPTIONS = [
  { value: 1, label: '1月' },
  { value: 2, label: '2月' },
  { value: 3, label: '3月' },
  { value: 4, label: '4月' },
  { value: 5, label: '5月' },
  { value: 6, label: '6月' },
  { value: 7, label: '7月' },
  { value: 8, label: '8月' },
  { value: 9, label: '9月' },
  { value: 10, label: '10月' },
  { value: 11, label: '11月' },
  { value: 12, label: '12月' }
];

const ExpenseForm = forwardRef<ExpenseFormHandle, ExpenseFormProps>(({ onSubmit, isLoading = false }, ref) => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  // LocalStorageから保存された値を取得（Issue #14対応）
  const getStoredFormData = (): CreateExpenseRequest => {
    try {
      const stored = localStorage.getItem('splitmate-expense-form');
      if (stored) {
        const parsedData = JSON.parse(stored);
        return {
          category: parsedData.category || '',
          description: parsedData.description || '',
          amount: 0, // 金額は常に0からスタート
          payerId: parsedData.payerId || 'husband-001',
          expenseYear: parsedData.expenseYear || currentYear,
          expenseMonth: parsedData.expenseMonth || currentMonth
        };
      }
    } catch (error) {
      console.warn('Failed to load stored form data:', error);
    }
    
    // デフォルト値
    return {
      category: '',
      description: '',
      amount: 0,
      payerId: 'husband-001',
      expenseYear: currentYear,
      expenseMonth: currentMonth
    };
  };

  const [formData, setFormData] = useState<CreateExpenseRequest>(getStoredFormData);

  // フォームデータの変更時にLocalStorageに保存（金額以外）
  const saveFormDataToStorage = (data: CreateExpenseRequest) => {
    try {
      const dataToStore = {
        category: data.category,
        description: data.description,
        payerId: data.payerId,
        expenseYear: data.expenseYear,
        expenseMonth: data.expenseMonth
        // amount は保存しない
      };
      localStorage.setItem('splitmate-expense-form', JSON.stringify(dataToStore));
    } catch (error) {
      console.warn('Failed to save form data:', error);
    }
  };

  // 外部から呼び出せるメソッドを公開
  useImperativeHandle(ref, () => ({
    resetAmountOnly: () => {
      const newData = { ...formData, amount: 0 };
      setFormData(newData);
      saveFormDataToStorage(newData);
    },
    resetAll: () => {
      const clearedData = {
        category: '',
        description: '',
        amount: 0,
        payerId: 'husband-001',
        expenseYear: currentYear,
        expenseMonth: currentMonth
      };
      setFormData(clearedData);
      localStorage.removeItem('splitmate-expense-form');
    }
  }), [formData, currentYear, currentMonth]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.category && formData.description && formData.amount > 0) {
      onSubmit(formData);
      
      // Issue #14: 金額のみリセット、他のフィールドは保持
      const newData = { ...formData, amount: 0 };
      setFormData(newData);
      saveFormDataToStorage(newData);
    }
  };

  const handleInputChange = (field: keyof CreateExpenseRequest, value: string | number) => {
    const newData = {
      ...formData,
      [field]: value
    };
    setFormData(newData);
    saveFormDataToStorage(newData);
  };

  const handleClearForm = () => {
    const clearedData = {
      category: '',
      description: '',
      amount: 0,
      payerId: 'husband-001',
      expenseYear: currentYear,
      expenseMonth: currentMonth
    };
    setFormData(clearedData);
    localStorage.removeItem('splitmate-expense-form');
  };

  return (
    <div className="card">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">費用入力</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 年月選択 */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="expenseYear" className="block text-sm font-medium text-gray-700 mb-2">
              年 *
            </label>
            <select
              id="expenseYear"
              value={formData.expenseYear}
              onChange={(e) => handleInputChange('expenseYear', parseInt(e.target.value))}
              className="input-field"
              required
            >
              {generateYearOptions().map(year => (
                <option key={year} value={year}>
                  {year}年
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="expenseMonth" className="block text-sm font-medium text-gray-700 mb-2">
              月 *
            </label>
            <select
              id="expenseMonth"
              value={formData.expenseMonth}
              onChange={(e) => handleInputChange('expenseMonth', parseInt(e.target.value))}
              className="input-field"
              required
            >
              {MONTH_OPTIONS.map(month => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* カテゴリ選択 */}
        <div>
          <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
            カテゴリ *
          </label>
          <select
            id="category"
            value={formData.category}
            onChange={(e) => handleInputChange('category', e.target.value)}
            className="input-field"
            required
          >
            <option value="">カテゴリを選択してください</option>
            {EXPENSE_CATEGORIES.map(category => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>

        {/* 説明入力 */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
            説明 *
          </label>
          <input
            type="text"
            id="description"
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            placeholder="例: マルエツで買い物"
            className="input-field"
            required
          />
        </div>

        {/* 金額入力 */}
        <div>
          <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-2">
            金額 (円) *
          </label>
          <input
            type="number"
            id="amount"
            value={formData.amount || ''}
            onChange={(e) => handleInputChange('amount', parseInt(e.target.value) || 0)}
            placeholder="3000"
            min="1"
            className="input-field"
            required
          />
        </div>

        {/* 立替者選択 */}
        <div>
          <label htmlFor="payerId" className="block text-sm font-medium text-gray-700 mb-2">
            立替者 *
          </label>
          <select
            id="payerId"
            value={formData.payerId}
            onChange={(e) => handleInputChange('payerId', e.target.value)}
            className="input-field"
            required
          >
            <option value="">立替者を選択してください</option>
            {DEFAULT_USERS.map(user => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </select>
        </div>

        {/* 送信ボタンとクリアボタン */}
        <div className="space-y-3">
          <button
            type="submit"
            disabled={isLoading || !formData.category || !formData.description || formData.amount <= 0}
            className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? '送信中...' : '入力完了'}
          </button>
          
          <button
            type="button"
            onClick={handleClearForm}
            className="w-full px-4 py-2 text-sm text-gray-600 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
          >
            フォームをクリア
          </button>
        </div>
      </form>
    </div>
  );
});

export { ExpenseForm as ExpenseFormBase };
export default memo(ExpenseForm); 
