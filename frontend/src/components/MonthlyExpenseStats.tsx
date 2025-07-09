import React from 'react';
import { MonthlyExpenseStats as Stats } from '../types';

interface MonthlyExpenseStatsProps {
  stats: Stats;
  isLoading?: boolean;
}

export const MonthlyExpenseStats: React.FC<MonthlyExpenseStatsProps> = ({ 
  stats, 
  isLoading = false 
}) => {
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('ja-JP').format(amount);
  };

  const formatMonthYear = (year: number, month: number) => {
    return `${year}年${month}月`;
  };

  const calculateGrowthRate = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  };

  if (isLoading) {
    return (
      <div className="card">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">月次統計</h2>
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      </div>
    );
  }

  const currentMonth = stats.currentMonth;
  const previousMonth = stats.previousMonth;
  const yearToDate = stats.yearToDate;

  const amountGrowth = calculateGrowthRate(currentMonth.totalAmount, previousMonth.totalAmount);
  const expenseCountGrowth = calculateGrowthRate(currentMonth.totalExpenses, previousMonth.totalExpenses);

  return (
    <div className="space-y-6">
      {/* 当月 vs 前月比較 */}
      <div className="card">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">月次統計</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* 当月 */}
          <div className="bg-blue-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-blue-800 mb-4">
              {formatMonthYear(currentMonth.year, currentMonth.month)}（当月）
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {currentMonth.totalExpenses}
                </div>
                <div className="text-sm text-gray-600">件数</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  ¥{formatAmount(currentMonth.totalAmount)}
                </div>
                <div className="text-sm text-gray-600">総額</div>
              </div>
            </div>
            
            {/* 当月の支払者別 */}
            <div className="mt-4 pt-4 border-t border-blue-200">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="text-center">
                  <div className="font-semibold text-blue-700">
                    ¥{formatAmount(currentMonth.husbandAmount)}
                  </div>
                  <div className="text-gray-600">夫支払い</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold text-blue-700">
                    ¥{formatAmount(currentMonth.wifeAmount)}
                  </div>
                  <div className="text-gray-600">妻支払い</div>
                </div>
              </div>
            </div>
          </div>

          {/* 前月 */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              {formatMonthYear(previousMonth.year, previousMonth.month)}（前月）
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-600">
                  {previousMonth.totalExpenses}
                </div>
                <div className="text-sm text-gray-600">件数</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-600">
                  ¥{formatAmount(previousMonth.totalAmount)}
                </div>
                <div className="text-sm text-gray-600">総額</div>
              </div>
            </div>
            
            {/* 前月の支払者別 */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="text-center">
                  <div className="font-semibold text-gray-700">
                    ¥{formatAmount(previousMonth.husbandAmount)}
                  </div>
                  <div className="text-gray-600">夫支払い</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold text-gray-700">
                    ¥{formatAmount(previousMonth.wifeAmount)}
                  </div>
                  <div className="text-gray-600">妻支払い</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 前月比増減 */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white border rounded-lg p-4 text-center">
            <div className={`text-lg font-bold ${amountGrowth >= 0 ? 'text-red-600' : 'text-green-600'}`}>
              {amountGrowth >= 0 ? '+' : ''}{amountGrowth}%
            </div>
            <div className="text-sm text-gray-600">金額前月比</div>
          </div>
          <div className="bg-white border rounded-lg p-4 text-center">
            <div className={`text-lg font-bold ${expenseCountGrowth >= 0 ? 'text-red-600' : 'text-green-600'}`}>
              {expenseCountGrowth >= 0 ? '+' : ''}{expenseCountGrowth}%
            </div>
            <div className="text-sm text-gray-600">件数前月比</div>
          </div>
        </div>
      </div>

      {/* 年間累計 */}
      <div className="card">
        <h3 className="text-xl font-bold mb-4 text-gray-800">年間累計（{currentMonth.year}年）</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              {yearToDate.totalExpenses}
            </div>
            <div className="text-sm text-gray-600">総件数</div>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              ¥{formatAmount(yearToDate.totalAmount)}
            </div>
            <div className="text-sm text-gray-600">総額</div>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              ¥{formatAmount(yearToDate.monthlyAverages)}
            </div>
            <div className="text-sm text-gray-600">月平均</div>
          </div>
        </div>
      </div>

      {/* カテゴリ別（当月） */}
      {Object.keys(currentMonth.categories).length > 0 && (
        <div className="card">
          <h3 className="text-xl font-bold mb-4 text-gray-800">
            カテゴリ別支出（{formatMonthYear(currentMonth.year, currentMonth.month)}）
          </h3>
          <div className="space-y-3">
            {Object.entries(currentMonth.categories)
              .sort(([,a], [,b]) => b - a)
              .map(([category, amount]) => {
                const percentage = currentMonth.totalAmount > 0 
                  ? Math.round((amount / currentMonth.totalAmount) * 100) 
                  : 0;
                
                return (
                  <div key={category} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-gray-800">{category}</span>
                      <span className="text-sm text-gray-500">({percentage}%)</span>
                    </div>
                    <span className="font-bold text-gray-900">
                      ¥{formatAmount(amount)}
                    </span>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}; 
