import React, { useState } from 'react';
import { Expense } from '../types';

interface ExpenseListProps {
  expenses: Expense[];
  onDelete: (id: string) => void;
  onBulkDelete: (ids: string[]) => void;
  isLoading?: boolean;
}

export const ExpenseList: React.FC<ExpenseListProps> = ({ expenses, onDelete, onBulkDelete, isLoading = false }) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
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

  // チェックボックスの制御
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(expenses.map(expense => expense.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectExpense = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds(prev => [...prev, id]);
    } else {
      setSelectedIds(prev => prev.filter(selectedId => selectedId !== id));
    }
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    setShowConfirmDialog(true);
  };

  const confirmBulkDelete = () => {
    onBulkDelete(selectedIds);
    setSelectedIds([]);
    setShowConfirmDialog(false);
  };

  const isAllSelected = expenses.length > 0 && selectedIds.length === expenses.length;
  const isIndeterminate = selectedIds.length > 0 && selectedIds.length < expenses.length;

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
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">費用一覧</h2>
        
        {/* 一括削除コントロール */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="select-all"
              checked={isAllSelected}
              ref={(input) => {
                if (input) input.indeterminate = isIndeterminate;
              }}
              onChange={(e) => handleSelectAll(e.target.checked)}
              className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
            />
            <label htmlFor="select-all" className="text-sm text-gray-600">
              全選択
            </label>
          </div>
          
          {selectedIds.length > 0 && (
            <button
              onClick={handleBulkDelete}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              選択した{selectedIds.length}件を削除
            </button>
          )}
        </div>
      </div>
      
      <div className="space-y-4">
        {expenses.map((expense) => (
          <div key={expense.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
              <div className="flex items-start gap-3 flex-1">
                <input
                  type="checkbox"
                  checked={selectedIds.includes(expense.id)}
                  onChange={(e) => handleSelectExpense(expense.id, e.target.checked)}
                  className="mt-1 w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
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

        {/* 確認ダイアログ */}
        {showConfirmDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                費用の一括削除
              </h3>
              <p className="text-gray-600 mb-6">
                選択した{selectedIds.length}件の費用を削除しますか？
                <br />
                この操作は取り消せません。
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowConfirmDialog(false)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  キャンセル
                </button>
                <button
                  onClick={confirmBulkDelete}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  削除する
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }; 
