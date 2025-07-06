import React, { useState } from 'react';
import { CreateExpenseRequest } from '../types';

interface ExpenseFormProps {
  onSubmit: (data: CreateExpenseRequest) => void;
  isLoading?: boolean;
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

export const ExpenseForm: React.FC<ExpenseFormProps> = ({ onSubmit, isLoading = false }) => {
  const [formData, setFormData] = useState<CreateExpenseRequest>({
    category: '',
    description: '',
    amount: 0,
    payerId: 'husband-001'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.category && formData.description && formData.amount > 0) {
      onSubmit(formData);
      // フォームをリセット
      setFormData({
        category: '',
        description: '',
        amount: 0,
        payerId: formData.payerId
      });
    }
  };

  const handleInputChange = (field: keyof CreateExpenseRequest, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div className="card">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">費用入力</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
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

        {/* 送信ボタン */}
        <button
          type="submit"
          disabled={isLoading || !formData.category || !formData.description || formData.amount <= 0}
          className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? '送信中...' : '入力完了'}
        </button>
      </form>
    </div>
  );
}; 
