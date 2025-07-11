import { useEffect, useState } from 'react';
import { allocationApi, settlementApi } from '../services/api';
import { AllocationRatio, Settlement } from '../types';

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

// 連絡確認ポップアップモーダル
interface ContactConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

function ContactConfirmModal({ isOpen, onClose, onConfirm }: ContactConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">精算金額の連絡</h2>
        </div>
        
        <div className="p-6">
          <p className="text-gray-700 mb-6">
            精算金額を連絡してください
          </p>
          
          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 transition-colors"
            >
              キャンセル
            </button>
            <button
              onClick={onConfirm}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 transition-colors"
            >
              OK
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function VerificationModal({ settlement, isOpen, onClose }: VerificationModalProps) {
  if (!isOpen) return null;

  const getPayerName = (payerId: string): string => {
    return payerId === 'husband' ? '夫' : '妻';
  };

  const getCalculationSteps = () => {
    const steps = [];
    
    // 基本情報
    steps.push({
      title: '1. 基本情報',
      items: [
        `費用金額: ¥${(settlement.husbandAmount + settlement.wifeAmount).toLocaleString()}`,
        `立替者: ${getPayerName(settlement.payer)}`,
        `受取者: ${getPayerName(settlement.receiver)}`
      ]
    });

    // 個別配分比率の表示
    if (settlement.usesCustomRatio && settlement.customHusbandRatio !== null && settlement.customWifeRatio !== null && settlement.customHusbandRatio !== undefined && settlement.customWifeRatio !== undefined) {
      steps.push({
        title: '2. 個別配分比率（カスタム設定）',
        items: [
          `夫の配分比率: ${Math.round(settlement.customHusbandRatio * 100)}%`,
          `妻の配分比率: ${Math.round(settlement.customWifeRatio * 100)}%`,
          '※ この費用は個別に配分比率が設定されています'
        ]
      });
    } else {
      steps.push({
        title: '2. 配分比率（全体設定）',
        items: [
          `夫の配分比率: ${Math.round((settlement.husbandAmount / (settlement.husbandAmount + settlement.wifeAmount)) * 100)}%`,
          `妻の配分比率: ${Math.round((settlement.wifeAmount / (settlement.husbandAmount + settlement.wifeAmount)) * 100)}%`,
          '※ 全体配分比率設定を使用'
        ]
      });
    }

    // 計算結果
    steps.push({
      title: '3. 負担額計算',
      items: [
        `夫の負担額: ¥${settlement.husbandAmount.toLocaleString()}`,
        `妻の負担額: ¥${settlement.wifeAmount.toLocaleString()}`,
        `差額: ¥${Math.abs(settlement.husbandAmount - settlement.wifeAmount).toLocaleString()}`
      ]
    });

    // 精算結果
    steps.push({
      title: '4. 精算結果',
      items: [
        `${getPayerName(settlement.receiver)}が${getPayerName(settlement.payer)}に支払い`,
        `精算金額: ¥${settlement.settlementAmount.toLocaleString()}`
      ]
    });

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
          <div className={`border rounded-lg p-4 mb-6 ${
            settlement.usesCustomRatio ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'
          }`}>
            <h3 className={`text-lg font-semibold mb-3 ${
              settlement.usesCustomRatio ? 'text-red-900' : 'text-blue-900'
            }`}>
              精算概要
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className={settlement.usesCustomRatio ? 'text-red-700 font-medium' : 'text-blue-700 font-medium'}>夫の負担額:</span>
                <span className={`ml-2 ${settlement.usesCustomRatio ? 'text-red-900' : 'text-blue-900'}`}>
                  ¥{settlement.husbandAmount.toLocaleString()}
                </span>
              </div>
              <div>
                <span className={settlement.usesCustomRatio ? 'text-red-700 font-medium' : 'text-blue-700 font-medium'}>妻の負担額:</span>
                <span className={`ml-2 ${settlement.usesCustomRatio ? 'text-red-900' : 'text-blue-900'}`}>
                  ¥{settlement.wifeAmount.toLocaleString()}
                </span>
              </div>
              <div>
                <span className={settlement.usesCustomRatio ? 'text-red-700 font-medium' : 'text-blue-700 font-medium'}>立替者:</span>
                <span className={`ml-2 ${settlement.usesCustomRatio ? 'text-red-900' : 'text-blue-900'}`}>{getPayerName(settlement.payer)}</span>
              </div>
              <div>
                <span className={settlement.usesCustomRatio ? 'text-red-700 font-medium' : 'text-blue-700 font-medium'}>精算金額:</span>
                <span className={`ml-2 font-bold ${settlement.usesCustomRatio ? 'text-red-900' : 'text-blue-900'}`}>¥{settlement.settlementAmount.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* 計算過程 */}
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900 mb-3">計算過程</h4>
            {getCalculationSteps().map((step, index) => (
              <div key={index} className="bg-gray-50 rounded-lg p-4">
                <h5 className="font-medium text-gray-900 mb-2">{step.title}</h5>
                <ul className="space-y-1">
                  {step.items.map((item, itemIndex) => (
                    <li key={itemIndex} className="text-sm text-gray-700">• {item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function FinalSettlementVerificationModal({ settlements, isOpen, onClose }: FinalSettlementVerificationModalProps) {
  if (!isOpen) return null;

  const getCalculationDetails = () => {
    let husbandShouldPay = 0;  // 夫が支払うべき金額
    let wifeShouldPay = 0;     // 妻が支払うべき金額
    
    const details = settlements.map((settlement) => {
      const receiverAmount = settlement.receiver === 'husband' ? settlement.settlementAmount : -settlement.settlementAmount;
      
      if (settlement.receiver === 'husband') {
        // receiver = husband means 夫が支払うべき
        husbandShouldPay += settlement.settlementAmount;
      } else {
        // receiver = wife means 妻が支払うべき
        wifeShouldPay += settlement.settlementAmount;
      }
      
      return {
        id: settlement.id,
        description: settlement.expenseDescription || '説明なし',
        receiver: settlement.receiver === 'husband' ? '夫' : '妻',
        payer: settlement.payer === 'husband' ? '夫' : '妻',
        amount: settlement.settlementAmount,
        receiverAmount,
        hasCustomRatio: settlement.usesCustomRatio,
        customHusbandRatio: settlement.customHusbandRatio,
        customWifeRatio: settlement.customWifeRatio
      };
    });
    
    const finalDirection = husbandShouldPay > wifeShouldPay ? {
      from: '夫',
      to: '妻', 
      amount: husbandShouldPay - wifeShouldPay
    } : wifeShouldPay > husbandShouldPay ? {
      from: '妻',
      to: '夫',
      amount: wifeShouldPay - husbandShouldPay
    } : null;
    
    return { details, finalDirection, husbandShouldPay, wifeShouldPay };
  };

  const { details, finalDirection, husbandShouldPay, wifeShouldPay } = getCalculationDetails();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
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
          {/* 個別精算明細 */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">個別精算明細</h3>
            <div className="space-y-3">
              {details.map((detail) => (
                <div key={detail.id} className={`rounded-lg p-4 border ${
                  detail.hasCustomRatio ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'
                }`}>
                  <div className="flex justify-between items-center">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="text-sm font-medium text-gray-900">{detail.description}</span>
                      </div>
                      <div className="text-xs text-gray-600">
                        {detail.receiver} → {detail.payer}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-sm font-medium ${
                        detail.receiverAmount > 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {detail.receiverAmount > 0 ? '+' : ''}¥{detail.amount.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 合計計算 */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h4 className="font-medium text-blue-900 mb-3">合計計算</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-blue-700 font-medium">夫の支払い合計:</span>
                <span className="ml-2 text-blue-900 font-bold">¥{husbandShouldPay.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-blue-700 font-medium">妻の支払い合計:</span>
                <span className="ml-2 text-blue-900 font-bold">¥{wifeShouldPay.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* 最終精算結果 */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h4 className="font-medium text-green-900 mb-3">最終精算結果</h4>
            {finalDirection ? (
              <p className="text-green-800">
                <span className="font-medium">{finalDirection.from}</span>が<span className="font-medium">{finalDirection.to}</span>に
                <span className="font-bold text-lg">¥{finalDirection.amount.toLocaleString()}</span>を支払う
              </p>
            ) : (
              <p className="text-green-800">
                精算金額はありません。すべての費用が適切に配分されています。
              </p>
            )}
          </div>
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
  const [defaultAllocationRatio, setDefaultAllocationRatio] = useState<AllocationRatio | null>(null);
  const [verificationModal, setVerificationModal] = useState<{ isOpen: boolean; settlement: Settlement | null }>({
    isOpen: false,
    settlement: null
  });

  const [finalSettlementVerificationModal, setFinalSettlementVerificationModal] = useState<{ isOpen: boolean; settlements: Settlement[] }>({
    isOpen: false,
    settlements: []
  });

  // 精算確定完了後のUX関連の状態管理
  const [isContactConfirmModalOpen, setIsContactConfirmModalOpen] = useState(false);
  const [isWaitingForSettlement, setIsWaitingForSettlement] = useState(false);
  const [isCompletingSettlement, setIsCompletingSettlement] = useState(false);

  useEffect(() => {
    loadSettlements();
    loadDefaultAllocationRatio();
  }, []);

  // 外部からの更新通知を受け取る
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'allocationRatioUpdated') {
        // 配分比率が更新された場合、精算一覧を再読み込み
        loadSettlements();
        localStorage.removeItem('allocationRatioUpdated');
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // 全体の配分比率を取得
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
        // ExpenseListに精算状況の変更を通知
        localStorage.setItem('settlementUpdated', Date.now().toString());
      } else {
        setError(response.error || '精算の承認に失敗しました');
      }
    } catch (err) {
      setError('精算の承認に失敗しました');
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

  // 個別配分比率が実際にデフォルトと異なるかどうかの判定
  const hasCustomRatio = (settlement: Settlement) => {
    if (!defaultAllocationRatio) return false;
    
    return settlement.usesCustomRatio && 
           settlement.customHusbandRatio !== null && 
           settlement.customWifeRatio !== null &&
           settlement.customHusbandRatio !== undefined &&
           settlement.customWifeRatio !== undefined &&
           (Math.abs(settlement.customHusbandRatio - defaultAllocationRatio.husbandRatio) > 0.01 ||
            Math.abs(settlement.customWifeRatio - defaultAllocationRatio.wifeRatio) > 0.01);
  };

  const handleFinalSettlement = () => {
    setShowFinalSettlement(true);
  };

  const getApprovedSettlements = () => {
    return settlements.filter(settlement => settlement.status === 'approved');
  };

  const getSettlementDirection = () => {
    const approvedSettlements = getApprovedSettlements();
    
    let husbandShouldPay = 0;  // 夫が支払うべき金額
    let wifeShouldPay = 0;     // 妻が支払うべき金額
    
    approvedSettlements.forEach(settlement => {
      if (settlement.receiver === 'husband') {
        // receiver = husband means 夫が支払うべき
        husbandShouldPay += settlement.settlementAmount;
      } else {
        // receiver = wife means 妻が支払うべき
        wifeShouldPay += settlement.settlementAmount;
      }
    });
    
    if (husbandShouldPay > wifeShouldPay) {
      return {
        from: '夫',
        to: '妻',
        amount: husbandShouldPay - wifeShouldPay
      };
    } else if (wifeShouldPay > husbandShouldPay) {
      return {
        from: '妻',
        to: '夫',
        amount: wifeShouldPay - husbandShouldPay
      };
    } else {
      return {
        from: null,
        to: null,
        amount: 0
      };
    }
  };

  const getFinalSettlementDate = () => {
    const today = new Date();
    const finalDate = new Date(today);
    finalDate.setDate(today.getDate() + 7); // 7日後
    
    return finalDate.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: '2-digit', 
      day: '2-digit'
    });
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

    // 連絡するボタンのハンドラー
    const handleContactClick = () => {
      setIsContactConfirmModalOpen(true);
    };

    // 連絡確認ポップアップのOKボタンハンドラー
    const handleContactConfirm = () => {
      setIsContactConfirmModalOpen(false);
      setIsWaitingForSettlement(true);
    };

    // 連絡確認ポップアップのキャンセル/閉じるハンドラー
    const handleContactCancel = () => {
      setIsContactConfirmModalOpen(false);
    };

    // 精算完了ボタンのハンドラー（メール送信機能は一時的に無効化）
    const handleSettlementComplete = async () => {
      setIsCompletingSettlement(true);
      try {
        console.log('精算完了処理開始...');
        
        // メール送信機能は一時的に無効化
        // const emailResult = await emailApi.sendSettlementCompletionEmail();
        
        // 代替処理：単純に精算完了とする
        alert('精算が完了しました。');
        setIsWaitingForSettlement(false);
        
      } catch (error) {
        console.error('精算完了エラー:', error);
        const errorMessage = error instanceof Error ? error.message : '精算完了処理に失敗しました。';
        alert(errorMessage);
      } finally {
        setIsCompletingSettlement(false);
      }
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
        <ContactConfirmModal
          isOpen={isContactConfirmModalOpen}
          onClose={handleContactCancel}
          onConfirm={handleContactConfirm}
        />
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
              {!isWaitingForSettlement ? (
                <button
                  onClick={handleContactClick}
                  className="ml-4 inline-flex items-center px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 hover:border-blue-300 transition-colors"
                  title="精算金額を連絡する"
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a2 2 0 01-2-2v-6a2 2 0 012-2h8z" />
                  </svg>
                  連絡する
                </button>
              ) : (
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
              )}
            </div>
          </div>

          {/* 精算待機中メッセージと精算完了ボタン */}
          {isWaitingForSettlement && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-yellow-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-yellow-800 font-medium">精算待機中</p>
                </div>
                <button
                  onClick={handleSettlementComplete}
                  disabled={isCompletingSettlement}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isCompletingSettlement ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      処理中...
                    </>
                  ) : (
                    '精算完了'
                  )}
                </button>
              </div>
            </div>
          )}
          
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
                  <div key={settlement.id} className={`flex justify-between text-sm p-2 rounded ${
                    hasCustomRatio(settlement) ? 'bg-red-50 border border-red-200' : ''
                  }`}>
                    <div className="flex items-center space-x-2">
                      <span>精算 {index + 1} ({isReceiver} → {isPayer})</span>
                    </div>
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
          <div className="space-y-6">
            {/* 夫の精算 */}
            {(() => {
              const husbandSettlements = settlements.filter(s => s.payer === 'husband');
              if (husbandSettlements.length === 0) return null;
              
              return (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-blue-900 mb-4">夫の精算</h3>
                  <div className="space-y-3">
                    {husbandSettlements.map((settlement) => {
                      const hasCustom = hasCustomRatio(settlement);
                      return (
                        <div key={settlement.id} className={`rounded-lg p-4 border ${
                          hasCustom ? 'bg-red-50 border-red-200' : 'bg-white border-blue-100'
                        }`}>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-2">
                                <h4 className="text-sm font-medium text-gray-900">
                                  説明: {settlement.expenseDescription || '説明なし'}
                                </h4>
                                {getStatusBadge(settlement.status)}
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                <div>
                                  <span className="text-gray-500">合計金額:</span>
                                  <span className="ml-2 font-medium text-gray-900">
                                    ¥{(settlement.husbandAmount + settlement.wifeAmount).toLocaleString()}
                                  </span>
                                </div>
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
                              <button
                                onClick={() => setVerificationModal({ isOpen: true, settlement })}
                                className="inline-flex items-center px-2 py-1 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 hover:border-blue-300 transition-colors"
                                title="精算ロジックを確認"
                              >
                                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                検算
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
            
            {/* 妻の精算 */}
            {(() => {
              const wifeSettlements = settlements.filter(s => s.payer === 'wife');
              if (wifeSettlements.length === 0) return null;
              
              return (
                <div className="bg-pink-50 border border-pink-200 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-pink-900 mb-4">妻の精算</h3>
                  <div className="space-y-3">
                    {wifeSettlements.map((settlement) => {
                      const hasCustom = hasCustomRatio(settlement);
                      return (
                        <div key={settlement.id} className={`rounded-lg p-4 border ${
                          hasCustom ? 'bg-red-50 border-red-200' : 'bg-white border-pink-100'
                        }`}>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-2">
                                <h4 className="text-sm font-medium text-gray-900">
                                  説明: {settlement.expenseDescription || '説明なし'}
                                </h4>
                                {getStatusBadge(settlement.status)}
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                <div>
                                  <span className="text-gray-500">合計金額:</span>
                                  <span className="ml-2 font-medium text-gray-900">
                                    ¥{(settlement.husbandAmount + settlement.wifeAmount).toLocaleString()}
                                  </span>
                                </div>
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
                              <button
                                onClick={() => setVerificationModal({ isOpen: true, settlement })}
                                className="inline-flex items-center px-2 py-1 text-xs font-medium text-pink-600 bg-pink-50 border border-pink-200 rounded hover:bg-pink-100 hover:border-pink-300 transition-colors"
                                title="精算ロジックを確認"
                              >
                                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                検算
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
} 
