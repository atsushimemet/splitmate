import { useEffect, useState } from 'react';
import { AllocationRatioForm } from './components/AllocationRatioForm';
import { ExpenseForm } from './components/ExpenseForm';
import { ExpenseList } from './components/ExpenseList';
import { ExpenseStats } from './components/ExpenseStats';
import { SettlementList } from './components/SettlementList';
import { expenseApi, settlementApi } from './services/api';
import { AllocationRatio, CreateExpenseRequest, Expense, ExpenseStats as Stats } from './types';

function App() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalExpenses: 0,
    totalAmount: 0,
    averageAmount: 0,
    minAmount: 0,
    maxAmount: 0
  });
  const [allocationRatio, setAllocationRatio] = useState<AllocationRatio | null>(null);
  const [activeTab, setActiveTab] = useState<'expenses' | 'allocation' | 'settlements'>('expenses');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 初期データの読み込み
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // 費用一覧を取得
      const expensesResponse = await expenseApi.getAllExpenses();
      if (expensesResponse.success && expensesResponse.data) {
        setExpenses(expensesResponse.data);
      } else {
        setError(expensesResponse.error || 'データの取得に失敗しました');
      }

      // 統計情報を取得
      const statsResponse = await expenseApi.getStats();
      if (statsResponse.success && statsResponse.data) {
        setStats(statsResponse.data);
      }
    } catch (err) {
      setError('データの取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitExpense = async (data: CreateExpenseRequest) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await expenseApi.createExpense(data);
      if (response.success && response.data) {
        // 新しい費用をリストに追加
        setExpenses(prev => [response.data!, ...prev]);
        
        // 統計情報を更新
        await loadData();
        
        // 精算を自動計算
        const settlementResponse = await settlementApi.calculateSettlement(response.data.id);
        if (settlementResponse.success) {
          console.log('精算が自動計算されました:', settlementResponse.data);
        }
      } else {
        setError(response.error || '費用の作成に失敗しました');
      }
    } catch (err) {
      setError('費用の作成に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!confirm('この費用を削除しますか？')) {
      return;
    }

    try {
      const response = await expenseApi.deleteExpense(id);
      if (response.success) {
        // 削除された費用をリストから除外
        setExpenses(prev => prev.filter(expense => expense.id !== id));
        
        // 統計情報を更新
        await loadData();
      } else {
        setError(response.error || '費用の削除に失敗しました');
      }
    } catch (err) {
      setError('費用の削除に失敗しました');
    }
  };

  const handleAllocationRatioChange = (ratio: AllocationRatio) => {
    setAllocationRatio(ratio);
  };

  const handleSettlementUpdate = () => {
    // 精算が更新された時の処理
    console.log('精算が更新されました');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">SplitMate</h1>
              <p className="text-gray-600">夫婦間家計費精算システム</p>
            </div>
            <button
              onClick={loadData}
              disabled={isLoading}
              className="btn-secondary"
            >
              {isLoading ? '更新中...' : '更新'}
            </button>
          </div>
        </div>
      </header>

      {/* タブナビゲーション */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('expenses')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'expenses'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              費用管理
            </button>
            <button
              onClick={() => setActiveTab('allocation')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'allocation'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              配分比率設定
            </button>
            <button
              onClick={() => setActiveTab('settlements')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'settlements'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              精算一覧
            </button>
          </nav>
        </div>
      </div>

      {/* メインコンテンツ */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* エラーメッセージ */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
              <div className="ml-auto pl-3">
                <button
                  onClick={() => setError(null)}
                  className="text-red-400 hover:text-red-600"
                >
                  <span className="sr-only">閉じる</span>
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'expenses' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* 左カラム: 費用入力フォーム */}
            <div className="lg:col-span-1">
              <ExpenseForm onSubmit={handleSubmitExpense} isLoading={isSubmitting} />
            </div>

            {/* 右カラム: 統計情報と費用一覧 */}
            <div className="lg:col-span-2 space-y-8">
              <ExpenseStats stats={stats} isLoading={isLoading} />
              <ExpenseList 
                expenses={expenses} 
                onDelete={handleDeleteExpense} 
                isLoading={isLoading} 
              />
            </div>
          </div>
        )}

        {activeTab === 'allocation' && (
          <div className="max-w-4xl mx-auto">
            <AllocationRatioForm onRatioChange={handleAllocationRatioChange} />
          </div>
        )}

        {activeTab === 'settlements' && (
          <div className="max-w-6xl mx-auto">
            <SettlementList onSettlementUpdate={handleSettlementUpdate} />
          </div>
        )}
      </main>
    </div>
  );
}

export default App; 
