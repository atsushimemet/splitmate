import React, { useCallback, useEffect, useState } from 'react';
import { allocationApi, expenseApi, settlementApi } from '../services/api';
import { AllocationRatio, Expense } from '../types';

interface ExpenseListProps {
  expenses: Expense[];
  onDelete: (id: string) => void;
  onBulkDelete: (ids: string[]) => void;
  isLoading?: boolean;
  title?: string; // タイトルをカスタマイズできるように
  onExpenseUpdate?: (expense: Expense) => void; // 費用更新時のコールバック
}

export const ExpenseList: React.FC<ExpenseListProps> = ({ 
  expenses, 
  onDelete, 
  onBulkDelete, 
  isLoading = false,
  title = "費用一覧",
  onExpenseUpdate
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [defaultAllocationRatio, setDefaultAllocationRatio] = useState<AllocationRatio | null>(null);
  const [updatingExpenses, setUpdatingExpenses] = useState<Set<string>>(new Set());
  // リアルタイム表示用の一時的な配分比率を保存
  const [tempRatios, setTempRatios] = useState<Map<string, number>>(new Map());
  // デバウンス用のタイマーを保存
  const [debounceTimers, setDebounceTimers] = useState<Map<string, NodeJS.Timeout>>(new Map());
  // 承認済み精算に関連する費用IDのセット
  const [approvedExpenseIds, setApprovedExpenseIds] = useState<Set<string>>(new Set());

  // 全体の配分比率を取得
  useEffect(() => {
    const loadDefaultAllocationRatio = async () => {
      try {
        const response = await allocationApi.getAllocationRatio();
        if (response.success && response.data) {
          setDefaultAllocationRatio(response.data);
        }
      } catch (error) {
        console.error('Failed to load default allocation ratio:', error);
      }
    };

    loadDefaultAllocationRatio();
  }, []);

  // 承認済み精算情報を取得
  useEffect(() => {
    const loadApprovedSettlements = async () => {
      try {
        const response = await settlementApi.getAllSettlements();
        if (response.success && response.data) {
          const approvedIds = new Set(
            response.data
              .filter(settlement => settlement.status === 'approved')
              .map(settlement => settlement.expenseId)
          );
          setApprovedExpenseIds(approvedIds);
        }
      } catch (error) {
        console.error('Failed to load approved settlements:', error);
      }
    };

    loadApprovedSettlements();
    
    // ストレージイベントリスナーを追加（精算状況変更時の自動更新）
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'settlementUpdated' || e.key === 'allocationRatioUpdated') {
        loadApprovedSettlements();
        if (e.key === 'settlementUpdated') {
          localStorage.removeItem('settlementUpdated');
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // クリーンアップ処理：コンポーネントのアンマウント時にタイマーをクリア
  useEffect(() => {
    return () => {
      // 全てのデバウンスタイマーをクリア
      debounceTimers.forEach((timer) => {
        clearTimeout(timer);
      });
    };
  }, [debounceTimers]);
  
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

  const formatMonthYear = (year: number, month: number) => {
    return `${year}年${month}月`;
  };

  // 配分比率が全体設定と異なるかどうかを判定
  const isCustomRatio = (expense: Expense) => {
    if (!defaultAllocationRatio) return false;
    
    return expense.usesCustomRatio && 
           expense.customHusbandRatio !== null && 
           expense.customWifeRatio !== null &&
           expense.customHusbandRatio !== undefined &&
           expense.customWifeRatio !== undefined &&
           (Math.abs(expense.customHusbandRatio - defaultAllocationRatio.husbandRatio) > 0.01 ||
            Math.abs(expense.customWifeRatio - defaultAllocationRatio.wifeRatio) > 0.01);
  };

  // 費用明細が承認済み精算に関連しているかどうかを判定
  const isExpenseApproved = (expenseId: string): boolean => {
    return approvedExpenseIds.has(expenseId);
  };

  // 配分比率の更新（デバウンス機能付き）
  const debouncedUpdateAllocationRatio = useCallback(async (expenseId: string, husbandRatio: number) => {
    // 承認済み費用明細の場合は更新を拒否
    if (isExpenseApproved(expenseId)) {
      console.log('Cannot update allocation ratio for approved expense');
      return;
    }

    const wifeRatio = 1 - husbandRatio;
    
    setUpdatingExpenses(prev => new Set(prev).add(expenseId));
    
    try {
      const updateData = {
        customHusbandRatio: Number(husbandRatio),
        customWifeRatio: Number(wifeRatio),
        usesCustomRatio: true
      };
      
      const response = await expenseApi.updateExpenseAllocationRatio(expenseId, updateData);
      
      if (response.success && response.data) {
        // レイアウトシフトを防ぐため、先に一時的な値をクリア
        setTempRatios(prev => {
          const newMap = new Map(prev);
          newMap.delete(expenseId);
          return newMap;
        });
        // その後で状態更新（もうレイアウトシフトしない）
        onExpenseUpdate?.(response.data);
      }
    } catch (error) {
      console.error('Failed to update allocation ratio:', error);
      // エラー時も一時的な値をクリア
      setTempRatios(prev => {
        const newMap = new Map(prev);
        newMap.delete(expenseId);
        return newMap;
      });
    } finally {
      setUpdatingExpenses(prev => {
        const newSet = new Set(prev);
        newSet.delete(expenseId);
        return newSet;
      });
    }
  }, [onExpenseUpdate, approvedExpenseIds]);

  // スライダーの操作ハンドラー（リアルタイム表示 + デバウンスAPI呼び出し）
  const handleAllocationRatioChange = useCallback((expenseId: string, husbandRatio: number) => {
    // 承認済み費用明細の場合は操作を無効化
    if (isExpenseApproved(expenseId)) {
      return;
    }

    // リアルタイム表示のために一時的な値を設定
    setTempRatios(prev => {
      const newMap = new Map(prev);
      newMap.set(expenseId, husbandRatio);
      return newMap;
    });

    // 既存のタイマーをクリア
    setDebounceTimers(prev => {
      const existingTimer = prev.get(expenseId);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }
      return prev;
    });

    // 新しいタイマーを設定（500ms後にAPI呼び出し）
    const newTimer = setTimeout(() => {
      debouncedUpdateAllocationRatio(expenseId, husbandRatio);
      // タイマーをクリア
      setDebounceTimers(prev => {
        const newMap = new Map(prev);
        newMap.delete(expenseId);
        return newMap;
      });
    }, 500);

    // タイマーを保存
    setDebounceTimers(prev => {
      const newMap = new Map(prev);
      newMap.set(expenseId, newTimer);
      return newMap;
    });
  }, [debouncedUpdateAllocationRatio, approvedExpenseIds]);

  // 配分比率のリセット
  const handleResetAllocationRatio = useCallback(async (expenseId: string) => {
    // 承認済み費用明細の場合はリセットを拒否
    if (isExpenseApproved(expenseId)) {
      console.log('Cannot reset allocation ratio for approved expense');
      return;
    }

    if (!defaultAllocationRatio) return;
    
    // デバウンスタイマーをクリア
    setDebounceTimers(prev => {
      const existingTimer = prev.get(expenseId);
      if (existingTimer) {
        clearTimeout(existingTimer);
        const newMap = new Map(prev);
        newMap.delete(expenseId);
        return newMap;
      }
      return prev;
    });
    
    // 一時的な値をクリア
    setTempRatios(prev => {
      const newMap = new Map(prev);
      newMap.delete(expenseId);
      return newMap;
    });
    
    setUpdatingExpenses(prev => new Set(prev).add(expenseId));
    
    try {
      const resetData = {
        customHusbandRatio: Number(defaultAllocationRatio.husbandRatio),
        customWifeRatio: Number(defaultAllocationRatio.wifeRatio),
        usesCustomRatio: false
      };
      
      const response = await expenseApi.updateExpenseAllocationRatio(expenseId, resetData);
      
      if (response.success && response.data) {
        onExpenseUpdate?.(response.data);
      }
    } catch (error) {
      console.error('Failed to reset allocation ratio:', error);
    } finally {
      setUpdatingExpenses(prev => {
        const newSet = new Set(prev);
        newSet.delete(expenseId);
        return newSet;
      });
    }
  }, [defaultAllocationRatio, onExpenseUpdate, approvedExpenseIds]);

  // 現在の配分比率を取得（一時的な値も考慮）
  const getCurrentRatio = (expense: Expense): number => {
    // 一時的な値が設定されている場合はそれを優先
    const tempRatio = tempRatios.get(expense.id);
    if (tempRatio !== undefined) {
      return tempRatio;
    }
    
    // 個別設定がある場合
    if (expense.usesCustomRatio && 
        expense.customHusbandRatio !== null && 
        expense.customHusbandRatio !== undefined) {
      return expense.customHusbandRatio;
    }
    
    // デフォルト値
    return defaultAllocationRatio?.husbandRatio || 0.7;
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
        <h2 className="text-2xl font-bold mb-6 text-gray-800">{title}</h2>
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      </div>
    );
  }

  if (expenses.length === 0) {
    return (
      <div className="card">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">{title}</h2>
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
        <h2 className="text-2xl font-bold text-gray-800">{title}</h2>
        
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
        {expenses.map((expense) => {
          const hasCustomRatio = isCustomRatio(expense);
          const currentRatio = getCurrentRatio(expense);
          const isUpdating = updatingExpenses.has(expense.id);
          const isApproved = isExpenseApproved(expense.id);
          
          return (
            <div 
              key={expense.id} 
              className={`border rounded-lg p-4 hover:shadow-md transition-shadow ${
                hasCustomRatio ? 'bg-red-50 border-red-200' : 'border-gray-200'
              } ${isApproved ? 'opacity-75' : ''}`}
            >
              {/* チェックボックス */}
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={selectedIds.includes(expense.id)}
                  onChange={(e) => handleSelectExpense(expense.id, e.target.checked)}
                  className="mt-1 w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
                
                <div className="flex-1 space-y-2">
                  {/* 1行目：金額 削除ボタン */}
                  <div className="flex justify-between items-center">
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

                  {/* 2行目：カテゴリ 年月 */}
                  <div className="flex items-center gap-2">
                    <span className="inline-block bg-primary-100 text-primary-800 text-xs px-2 py-1 rounded-full">
                      {expense.category}
                    </span>
                    <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                      {formatMonthYear(expense.expenseYear, expense.expenseMonth)}
                    </span>
                    <span className="text-sm text-gray-500">
                      {getPayerName(expense.payerId)}
                    </span>
                    {isApproved && (
                      <span className="inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                        承認済み
                      </span>
                    )}
                  </div>

                  {/* 3行目：説明 */}
                  <div>
                    <h3 className="font-medium text-gray-900">
                      {expense.description}
                    </h3>
                  </div>

                  {/* 4行目：夫~~% */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-600">夫:</span>
                    <span className="text-xs font-medium text-gray-900">
                      {Math.round(currentRatio * 100)}%
                    </span>
                    {/* スピナー用の固定幅スペース（レイアウトシフト防止） */}
                    <div className="w-3 h-3 flex items-center justify-center">
                      {isUpdating && (
                        <div className="w-3 h-3 border border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
                      )}
                    </div>
                    {isApproved && (
                      <span className="text-xs text-gray-500">（変更不可）</span>
                    )}
                  </div>

                  {/* 5行目：スライダー リセット */}
                  <div className="flex items-center gap-2 min-h-[24px]">
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={currentRatio}
                      onChange={(e) => handleAllocationRatioChange(expense.id, parseFloat(e.target.value))}
                      disabled={isUpdating || isApproved}
                      className={`flex-1 h-2 bg-gray-200 rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        isApproved ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
                      }`}
                      style={{ touchAction: 'pan-y' }}
                    />
                    {/* リセットボタン用の固定スペース（レイアウトシフト防止） */}
                    <div className="w-12 flex justify-end">
                      <button
                        onClick={() => handleResetAllocationRatio(expense.id)}
                        disabled={isUpdating || isApproved}
                        className={`text-xs whitespace-nowrap px-1 py-0 min-w-0 flex-shrink-0 ${
                          hasCustomRatio && !isApproved
                            ? 'text-blue-600 hover:text-blue-800 disabled:text-gray-400 visible' 
                            : 'invisible'
                        }`}
                        title={isApproved ? "承認済みのため変更できません" : "デフォルトに戻す"}
                      >
                        リセット
                      </button>
                    </div>
                  </div>

                  {/* 6行目：yyyy/mm/dd 時刻 */}
                  <div>
                    <p className="text-sm text-gray-500">
                      {formatDate(expense.createdAt)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
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
