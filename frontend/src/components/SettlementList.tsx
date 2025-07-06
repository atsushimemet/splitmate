import { useEffect, useState } from 'react';
import { settlementApi } from '../services/api';
import { Settlement } from '../types';

interface SettlementListProps {
  onSettlementUpdate?: () => void;
}

export function SettlementList({ onSettlementUpdate }: SettlementListProps) {
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSettlements();
  }, []);

  const loadSettlements = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await settlementApi.getAllSettlements();
      if (response.success && response.data) {
        setSettlements(response.data);
      } else {
        setError(response.error || '精算一覧の取得に失敗しました');
      }
    } catch (err) {
      setError('精算一覧の取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (settlementId: string) => {
    try {
      const response = await settlementApi.approveSettlement(settlementId);
      if (response.success) {
        await loadSettlements();
        onSettlementUpdate?.();
      } else {
        setError(response.error || '精算の承認に失敗しました');
      }
    } catch (err) {
      setError('精算の承認に失敗しました');
    }
  };

  const handleComplete = async (settlementId: string) => {
    try {
      const response = await settlementApi.completeSettlement(settlementId);
      if (response.success) {
        await loadSettlements();
        onSettlementUpdate?.();
      } else {
        setError(response.error || '精算の完了に失敗しました');
      }
    } catch (err) {
      setError('精算の完了に失敗しました');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">承認待ち</span>;
      case 'approved':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">承認済み</span>;
      case 'completed':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">完了</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">{status}</span>;
    }
  };

  const getPayerLabel = (payer: string) => {
    return payer === 'husband' ? '夫' : '妻';
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">精算一覧を読み込み中...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">精算一覧</h2>
        <p className="text-sm text-gray-600">費用の精算状況を確認できます</p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border-b border-red-200">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <div className="overflow-hidden">
        {settlements.length === 0 ? (
          <div className="text-center py-8">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">精算がありません</h3>
            <p className="mt-1 text-sm text-gray-500">費用を入力すると精算が自動的に計算されます</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {settlements.map((settlement) => (
              <div key={settlement.id} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-sm font-medium text-gray-900">
                        精算 #{settlement.id.split('_')[1]}
                      </h3>
                      {getStatusBadge(settlement.status)}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">夫の負担額:</span>
                        <span className="ml-2 font-medium text-gray-900">
                          ¥{settlement.husbandAmount.toLocaleString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">妻の負担額:</span>
                        <span className="ml-2 font-medium text-gray-900">
                          ¥{settlement.wifeAmount.toLocaleString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">精算金額:</span>
                        <span className="ml-2 font-medium text-blue-600">
                          ¥{settlement.settlementAmount.toLocaleString()}
                        </span>
                      </div>
                    </div>
                    
                    <div className="mt-3 text-sm text-gray-600">
                      <span className="text-gray-500">支払者:</span>
                      <span className="ml-2 font-medium text-gray-900">{getPayerLabel(settlement.payer)}</span>
                      <span className="mx-2">→</span>
                      <span className="text-gray-500">受取者:</span>
                      <span className="ml-2 font-medium text-gray-900">{getPayerLabel(settlement.receiver)}</span>
                    </div>
                    
                    <div className="mt-2 text-xs text-gray-500">
                      作成日: {new Date(settlement.createdAt).toLocaleDateString('ja-JP')}
                    </div>
                  </div>
                  
                  <div className="ml-4 flex flex-col space-y-2">
                    {settlement.status === 'pending' && (
                      <button
                        onClick={() => handleApprove(settlement.id)}
                        className="btn-primary text-sm px-3 py-1"
                      >
                        承認
                      </button>
                    )}
                    {settlement.status === 'approved' && (
                      <button
                        onClick={() => handleComplete(settlement.id)}
                        className="btn-primary text-sm px-3 py-1"
                      >
                        完了
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 
