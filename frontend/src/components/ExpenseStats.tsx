import React from 'react';
import { ExpenseStats as Stats } from '../types';

interface ExpenseStatsProps {
  stats: Stats;
  isLoading?: boolean;
}

export const ExpenseStats: React.FC<ExpenseStatsProps> = ({ stats, isLoading = false }) => {
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('ja-JP').format(amount);
  };

  if (isLoading) {
    return (
      <div className="card">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">統計情報</h2>
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">統計情報</h2>
      
      <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
        <div className="text-center p-4 bg-blue-50 rounded-lg">
          <div className="text-2xl font-bold text-blue-600">
            {stats.totalExpenses}
          </div>
          <div className="text-sm text-gray-600">総件数</div>
        </div>
        
        <div className="text-center p-4 bg-green-50 rounded-lg">
          <div className="text-2xl font-bold text-green-600">
            ¥{formatAmount(stats.totalAmount)}
          </div>
          <div className="text-sm text-gray-600">総額</div>
        </div>
      </div>
    </div>
  );
}; 
