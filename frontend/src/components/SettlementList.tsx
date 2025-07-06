import { useEffect, useState } from 'react';
import { settlementApi } from '../services/api';
import { Settlement } from '../types';

interface SettlementListProps {
  onSettlementUpdate?: () => void;
}

interface VerificationModalProps {
  settlement: Settlement;
  isOpen: boolean;
  onClose: () => void;
}

interface FinalSettlementVerificationModalProps {
  settlements: Settlement[];
  isOpen: boolean;
  onClose: () => void;
}

function VerificationModal({ settlement, isOpen, onClose }: VerificationModalProps) {
  if (!isOpen) return null;

  const getPayerLabel = (payer: string) => {
    return payer === 'husband' ? '夫' : '妻';
  };

  const getCalculationSteps = () => {
    const totalAmount = settlement.husbandAmount + settlement.wifeAmount;
    
    const steps = [
      {
        step: 1,
        title: '立替者が総額を支払う',
        description: `立替者（${getPayerLabel(settlement.payer)}）が総額を支払う`,
        calculation: `${getPayerLabel(settlement.payer)}が支払った金額: ${totalAmount.toLocaleString()}円`,
        result: `${totalAmount.toLocaleString()}円`
      },
      {
        step: 2,
        title: '按分比率による負担金額の算出',
        description: `設定された按分比率に基づいて各人の負担金額を計算`,
        husbandCalc: `夫の負担額: ${settlement.husbandAmount.toLocaleString()}円`,
        wifeCalc: `妻の負担額: ${settlement.wifeAmount.toLocaleString()}円`,
        result: `夫: ${settlement.husbandAmount.toLocaleString()}円, 妻: ${settlement.wifeAmount.toLocaleString()}円`
      },
      {
        step: 3,
        title: '精算者の支払い金額を決定',
        description: `立替者でない人（精算者）が立替者に支払う金額を計算`,
        calculation: settlement.payer === 'husband' 
          ? `妻（精算者）が夫（立替者）に支払う金額: ${settlement.settlementAmount.toLocaleString()}円`
          : `夫（精算者）が妻（立替者）に支払う金額: ${settlement.settlementAmount.toLocaleString()}円`,
        result: `${getPayerLabel(settlement.receiver)}から${getPayerLabel(settlement.payer)}に${settlement.settlementAmount.toLocaleString()}円`
      }
    ];

    return steps;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">精算ロジック検算</h2>
              <p className="text-sm text-gray-600">精算金額の計算過程を確認できます</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* 基本情報 */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-3">精算概要</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-blue-700 font-medium">夫の負担額:</span>
                <span className="ml-2 text-blue-900">¥{settlement.husbandAmount.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-blue-700 font-medium">妻の負担額:</span>
                <span className="ml-2 text-blue-900">¥{settlement.wifeAmount.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-blue-700 font-medium">立替者:</span>
                <span className="ml-2 text-blue-900">{getPayerLabel(settlement.payer)}</span>
              </div>
              <div>
                <span className="text-blue-700 font-medium">精算金額:</span>
                <span className="ml-2 text-blue-900 font-bold">¥{settlement.settlementAmount.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* 計算過程 */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">計算過程</h3>
            {getCalculationSteps().map((step) => (
              <div key={step.step} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center mb-3">
                  <div className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium mr-3">
                    {step.step}
                  </div>
                  <h4 className="text-md font-medium text-gray-900">{step.title}</h4>
                </div>
                
                <p className="text-sm text-gray-600 mb-2">{step.description}</p>
                
                {step.husbandCalc && step.wifeCalc ? (
                  <div className="space-y-1 mb-2">
                    <div className="text-sm font-mono bg-gray-100 p-2 rounded">
                      {step.husbandCalc}
                    </div>
                    <div className="text-sm font-mono bg-gray-100 p-2 rounded">
                      {step.wifeCalc}
                    </div>
                  </div>
                ) : (
                  <div className="text-sm font-mono bg-gray-100 p-2 rounded mb-2">
                    {step.calculation}
                  </div>
                )}
                
                <div className="text-sm">
                  <span className="text-gray-600">結果: </span>
                  <span className="font-medium text-gray-900">{step.result}</span>
                </div>
              </div>
            ))}
          </div>


        </div>

        <div className="px-6 py-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="w-full btn-primary"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}

function FinalSettlementVerificationModal({ settlements, isOpen, onClose }: FinalSettlementVerificationModalProps) {
  if (!isOpen) return null;

  const getPayerLabel = (payer: string) => {
    return payer === 'husband' ? '夫' : '妻';
  };

  const getCalculationDetails = () => {
    // 妻から夫に支払う金額の合計
    const wifeToHusbandTotal = settlements
      .filter(settlement => settlement.payer === 'husband' && settlement.receiver === 'wife')
      .reduce((sum, settlement) => sum + settlement.settlementAmount, 0);

    // 夫から妻に支払う金額の合計
    const husbandToWifeTotal = settlements
      .filter(settlement => settlement.payer === 'wife' && settlement.receiver === 'husband')
      .reduce((sum, settlement) => sum + settlement.settlementAmount, 0);

    const finalAmount = Math.abs(wifeToHusbandTotal - husbandToWifeTotal);
    const finalDate = new Date();
    finalDate.setDate(finalDate.getDate() + 7);

    let direction = '';
    if (wifeToHusbandTotal > husbandToWifeTotal) {
      direction = `妻から夫に支払う金額の合計 > 夫から妻に支払う金額の合計なので\n妻から夫に${finalAmount.toLocaleString()}円を${finalDate.toLocaleDateString('ja-JP')}までに支払ってください。`;
    } else if (husbandToWifeTotal > wifeToHusbandTotal) {
      direction = `夫から妻に支払う金額の合計 > 妻から夫に支払う金額の合計なので\n夫から妻に${finalAmount.toLocaleString()}円を${finalDate.toLocaleDateString('ja-JP')}までに支払ってください。`;
    } else {
      direction = '精算金額はありません。すべての費用が適切に配分されています。';
    }

    return {
      wifeToHusbandTotal,
      husbandToWifeTotal,
      finalAmount,
      direction
    };
  };

  const calculationDetails = getCalculationDetails();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">全体精算ロジック検算</h2>
              <p className="text-sm text-gray-600">全体精算の計算過程を確認できます</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* 基本情報 */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-3">精算概要</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-blue-700 font-medium">妻から夫に支払う金額の合計:</span>
                <span className="ml-2 text-blue-900">¥{calculationDetails.wifeToHusbandTotal.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-blue-700 font-medium">夫から妻に支払う金額の合計:</span>
                <span className="ml-2 text-blue-900">¥{calculationDetails.husbandToWifeTotal.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* 計算過程 */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">計算過程</h3>
            
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center mb-3">
                <div className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium mr-3">
                  1
                </div>
                <h4 className="text-md font-medium text-gray-900">妻から夫に支払う金額の合計</h4>
              </div>
              <div className="text-sm font-mono bg-gray-100 p-2 rounded mb-2">
                ¥{calculationDetails.wifeToHusbandTotal.toLocaleString()}
              </div>
              <div className="text-sm">
                <span className="text-gray-600">結果: </span>
                <span className="font-medium text-gray-900">¥{calculationDetails.wifeToHusbandTotal.toLocaleString()}</span>
              </div>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center mb-3">
                <div className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium mr-3">
                  2
                </div>
                <h4 className="text-md font-medium text-gray-900">夫から妻に支払う金額の合計</h4>
              </div>
              <div className="text-sm font-mono bg-gray-100 p-2 rounded mb-2">
                ¥{calculationDetails.husbandToWifeTotal.toLocaleString()}
              </div>
              <div className="text-sm">
                <span className="text-gray-600">結果: </span>
                <span className="font-medium text-gray-900">¥{calculationDetails.husbandToWifeTotal.toLocaleString()}</span>
              </div>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center mb-3">
                <div className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium mr-3">
                  3
                </div>
                <h4 className="text-md font-medium text-gray-900">最終精算金額の決定</h4>
              </div>
              <div className="text-sm font-mono bg-gray-100 p-2 rounded mb-2 whitespace-pre-line">
                {calculationDetails.direction}
              </div>
              <div className="text-sm">
                <span className="text-gray-600">結果: </span>
                <span className="font-medium text-gray-900">
                  {calculationDetails.finalAmount > 0 
                    ? `¥${calculationDetails.finalAmount.toLocaleString()}`
                    : '精算不要'
                  }
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="w-full btn-primary"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}

export function SettlementList({ onSettlementUpdate }: SettlementListProps) {
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFinalSettlement, setShowFinalSettlement] = useState(false);
  const [verificationModal, setVerificationModal] = useState<{ isOpen: boolean; settlement: Settlement | null }>({
    isOpen: false,
    settlement: null
  });
  const [showTooltip, setShowTooltip] = useState(false);
  const [finalSettlementVerificationModal, setFinalSettlementVerificationModal] = useState<{ isOpen: boolean; settlements: Settlement[] }>({
    isOpen: false,
    settlements: []
  });

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

  const handleFinalSettlement = () => {
    setShowFinalSettlement(true);
  };

  const getApprovedSettlements = () => {
    return settlements.filter(settlement => settlement.status === 'approved');
  };

  const getSettlementDirection = () => {
    const approvedSettlements = getApprovedSettlements();
    
    // 夫と妻それぞれの未精算金額を計算
    let husbandUnsettled = 0;
    let wifeUnsettled = 0;
    
    console.log('承認済み精算:', approvedSettlements);
    
    approvedSettlements.forEach(settlement => {
      if (settlement.payer === 'husband') {
        // 夫が立替者の場合、妻が夫に精算金を支払う
        wifeUnsettled += settlement.settlementAmount;
        console.log(`夫が立替者: 精算金額 ${settlement.settlementAmount} を妻の未精算に追加`);
      } else {
        // 妻が立替者の場合、夫が妻に精算金を支払う
        husbandUnsettled += settlement.settlementAmount;
        console.log(`妻が立替者: 精算金額 ${settlement.settlementAmount} を夫の未精算に追加`);
      }
    });
    
    console.log(`夫の未精算: ${husbandUnsettled}, 妻の未精算: ${wifeUnsettled}`);
    
    // 精算方向を決定（未精算金額が多い方から少ない方へ）
    if (husbandUnsettled > wifeUnsettled) {
      console.log(`夫の未精算 > 妻の未精算: 夫から妻に ${husbandUnsettled - wifeUnsettled}`);
      return { from: '夫', to: '妻', amount: husbandUnsettled - wifeUnsettled };
    } else if (wifeUnsettled > husbandUnsettled) {
      console.log(`妻の未精算 > 夫の未精算: 妻から夫に ${wifeUnsettled - husbandUnsettled}`);
      return { from: '妻', to: '夫', amount: wifeUnsettled - husbandUnsettled };
    } else {
      console.log('未精算金額が同じ');
      return { from: null, to: null, amount: 0 };
    }
  };

  const getFinalSettlementDate = () => {
    const today = new Date();
    const finalDate = new Date(today);
    finalDate.setDate(today.getDate() + 7);
    return finalDate.toLocaleDateString('ja-JP');
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

  const handleCloseVerificationModal = () => {
    setVerificationModal({ isOpen: false, settlement: null });
  };

  // 全体精算画面を表示
  if (showFinalSettlement) {
    const approvedSettlements = getApprovedSettlements();
    const settlementDirection = getSettlementDirection();
    const finalDate = getFinalSettlementDate();

    const handleCloseFinalSettlementVerificationModal = () => {
      setFinalSettlementVerificationModal({ isOpen: false, settlements: [] });
    };

    return (
      <div className="bg-white rounded-lg shadow-sm border">
        {finalSettlementVerificationModal.isOpen && (
          <FinalSettlementVerificationModal
            settlements={finalSettlementVerificationModal.settlements}
            isOpen={finalSettlementVerificationModal.isOpen}
            onClose={handleCloseFinalSettlementVerificationModal}
          />
        )}
        {verificationModal.isOpen && verificationModal.settlement && (
          <VerificationModal
            settlement={verificationModal.settlement}
            isOpen={verificationModal.isOpen}
            onClose={handleCloseVerificationModal}
          />
        )}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">全体精算確定</h2>
              <p className="text-sm text-gray-600">承認済み精算の確定</p>
            </div>
            <button
              onClick={() => setShowFinalSettlement(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        
        <div className="p-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-blue-900 mb-2">精算確定完了</h3>
                {settlementDirection.from && settlementDirection.to ? (
                  <p className="text-blue-800">
                    <span className="font-medium">{settlementDirection.from}</span>から<span className="font-medium">{settlementDirection.to}</span>に
                    <span className="font-bold text-lg">¥{settlementDirection.amount.toLocaleString()}</span>を
                    <span className="font-medium">{finalDate}</span>までに支払ってください。
                  </p>
                ) : (
                  <p className="text-blue-800">
                    精算金額はありません。すべての費用が適切に配分されています。
                  </p>
                )}
              </div>
              <button
                onClick={() => setFinalSettlementVerificationModal({ isOpen: true, settlements: approvedSettlements })}
                className="ml-4 inline-flex items-center px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 hover:border-blue-300 transition-colors"
                title="全体精算ロジックを確認"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                検算
              </button>
            </div>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">承認済み精算明細</h4>
            <div className="space-y-2">
              {approvedSettlements.map((settlement, index) => {
                const isReceiver = settlement.receiver === 'wife' ? '妻' : '夫';
                const isPayer = settlement.payer === 'wife' ? '妻' : '夫';
                const amount = settlement.settlementAmount;
                const isNegative = settlement.receiver === 'wife' ? 
                  (settlementDirection.from === '妻' && settlementDirection.to === '夫') :
                  (settlementDirection.from === '夫' && settlementDirection.to === '妻');
                
                return (
                  <div key={settlement.id} className="flex justify-between text-sm">
                    <span>精算 {index + 1} ({isReceiver} → {isPayer})</span>
                    <span className={`font-medium ${isNegative ? 'text-red-600' : 'text-green-600'}`}>
                      {isNegative ? '-' : '+'}¥{amount.toLocaleString()}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="border-t border-gray-200 mt-3 pt-3 flex justify-between font-semibold">
              <span>合計</span>
              <span className={settlementDirection.amount > 0 ? 'text-red-600' : 'text-green-600'}>
                {settlementDirection.amount > 0 ? '-' : '+'}¥{settlementDirection.amount.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      {verificationModal.isOpen && verificationModal.settlement && (
        <VerificationModal
          settlement={verificationModal.settlement}
          isOpen={verificationModal.isOpen}
          onClose={handleCloseVerificationModal}
        />
      )}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">精算一覧</h2>
            <p className="text-sm text-gray-600">費用の精算状況を確認できます</p>
          </div>
          {getApprovedSettlements().length > 0 && (
            <button
              onClick={handleFinalSettlement}
              className="btn-primary text-sm px-4 py-2"
            >
              確定
            </button>
          )}
        </div>
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
                        精算
                      </h3>
                      {getStatusBadge(settlement.status)}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
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
                        <span className="text-gray-500">合計金額:</span>
                        <span className="ml-2 font-medium text-gray-900">
                          ¥{(settlement.husbandAmount + settlement.wifeAmount).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center">
                        <span className="text-gray-500">精算金額:</span>
                        <span className="ml-2 font-medium text-blue-600">
                          ¥{settlement.settlementAmount.toLocaleString()}
                        </span>
                        <button
                          onClick={() => setVerificationModal({ isOpen: true, settlement })}
                          className="ml-2 inline-flex items-center px-2 py-1 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 hover:border-blue-300 transition-colors"
                          title="精算ロジックを確認"
                        >
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          検算
                        </button>
                      </div>
                    </div>
                    
                    <div className="mt-3 text-sm text-gray-600">
                      <span className="text-gray-500">立替者:</span>
                      <span className="ml-2 font-medium text-gray-900">{getPayerLabel(settlement.payer)}</span>
                      <span className="mx-2">←</span>
                      <span className="text-gray-500 relative">
                        精算者:
                        <button
                          className="ml-1 text-gray-400 cursor-help"
                          onMouseEnter={() => setShowTooltip(true)}
                          onMouseLeave={() => setShowTooltip(false)}
                          onTouchStart={() => setShowTooltip(!showTooltip)}
                          onFocus={() => setShowTooltip(true)}
                          onBlur={() => setShowTooltip(false)}
                        >
                          ⓘ
                        </button>
                        {showTooltip && (
                          <div className="absolute bottom-full left-0 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg whitespace-nowrap z-10">
                            立替者に精算金を送る人
                            <div className="absolute top-full left-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
                          </div>
                        )}
                      </span>
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
