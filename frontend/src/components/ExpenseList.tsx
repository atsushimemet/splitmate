import React from 'react';
import { Expense } from '../types';

interface ExpenseListProps {
  expenses: Expense[];
  onDelete: (id: string) => void;
  isLoading?: boolean;
}

export const ExpenseList: React.FC<ExpenseListProps> = ({ expenses, onDelete, isLoading = false }) => {
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('ja-JP').format(amount);
  };

  const getPayerName = (payerId: string) => {
    return payerId === 'husband-001' ? '夫' : '妻';
  };

  if (isLoading) {
    return (
      <div className="card">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">費用一覧</h2>
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      </div>
    );
  }

  if (expenses.length === 0) {
    return (
      <div className="card">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">費用一覧</h2>
        <div className="text-center py-8 text-gray-500">
          <p>まだ費用が登録されていません</p>
          <p className="text-sm mt-2">費用を入力してください</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">費用一覧</h2>
      
      <div className="space-y-4">
        {expenses.map((expense) => (
          <div key={expense.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="inline-block bg-primary-100 text-primary-800 text-xs px-2 py-1 rounded-full">
                    {expense.category}
                  </span>
                  <span className="text-sm text-gray-500">
                    {getPayerName(expense.payerId)}
                  </span>
                </div>
                
                <h3 className="font-medium text-gray-900 mb-1">
                  {expense.description}
                </h3>
                
                <p className="text-sm text-gray-500">
                  {formatDate(expense.createdAt)}
                </p>
              </div>
              
              <div className="flex items-center gap-3">
                <span className="text-lg font-bold text-gray-900">
                  ¥{formatAmount(expense.amount)}
                </span>
                
                <button
                  onClick={() => onDelete(expense.id)}
                  className="text-red-600 hover:text-red-800 text-sm font-medium"
                  title="削除"
                >
                  削除
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}; 
