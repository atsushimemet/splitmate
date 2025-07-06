import { useEffect, useState } from 'react';
import { allocationApi } from '../services/api';
import { AllocationRatio } from '../types';

interface AllocationRatioFormProps {
  onRatioChange?: (ratio: AllocationRatio) => void;
}

export function AllocationRatioForm({ onRatioChange }: AllocationRatioFormProps) {
  const [husbandRatio, setHusbandRatio] = useState(70);
  const [wifeRatio, setWifeRatio] = useState(30);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // 初期データの読み込み
  useEffect(() => {
    loadAllocationRatio();
  }, []);

  const loadAllocationRatio = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await allocationApi.getAllocationRatio();
      if (response.success && response.data) {
        setHusbandRatio(response.data.husbandRatio * 100);
        setWifeRatio(response.data.wifeRatio * 100);
        onRatioChange?.(response.data);
      }
    } catch (err) {
      setError('配分比率の取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleHusbandRatioChange = (value: number) => {
    const newHusbandRatio = Math.max(0, Math.min(100, value));
    setHusbandRatio(newHusbandRatio);
    setWifeRatio(100 - newHusbandRatio);
  };

  const handleWifeRatioChange = (value: number) => {
    const newWifeRatio = Math.max(0, Math.min(100, value));
    setWifeRatio(newWifeRatio);
    setHusbandRatio(100 - newWifeRatio);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await allocationApi.updateAllocationRatio({
        husbandRatio: husbandRatio / 100,
        wifeRatio: wifeRatio / 100
      });

      if (response.success && response.data) {
        setSuccess('配分比率を更新しました');
        onRatioChange?.(response.data);
      } else {
        setError(response.error || '配分比率の更新に失敗しました');
      }
    } catch (err) {
      setError('配分比率の更新に失敗しました');
    } finally {
      setIsSaving(false);
    }
  };

  const resetToDefault = () => {
    setHusbandRatio(70);
    setWifeRatio(30);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">配分比率設定</h2>
          <p className="text-sm text-gray-600">夫婦間の費用配分比率を設定してください</p>
        </div>
        <button
          onClick={resetToDefault}
          disabled={isLoading || isSaving}
          className="text-sm text-blue-600 hover:text-blue-800 disabled:text-gray-400"
        >
          デフォルトに戻す
        </button>
      </div>

      {/* エラーメッセージ */}
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* 成功メッセージ */}
      {success && (
        <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-3">
          <p className="text-sm text-green-800">{success}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 配分比率の表示 */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">現在の配分比率</span>
            <span className="text-sm text-gray-500">合計: {husbandRatio + wifeRatio}%</span>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm text-gray-600">夫</span>
                <span className="text-sm font-medium text-gray-900">{husbandRatio}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${husbandRatio}%` }}
                ></div>
              </div>
            </div>
            
            <div className="flex-1">
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm text-gray-600">妻</span>
                <span className="text-sm font-medium text-gray-900">{wifeRatio}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-pink-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${wifeRatio}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* 配分比率の調整 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="husband-ratio" className="block text-sm font-medium text-gray-700 mb-2">
              夫の配分比率 (%)
            </label>
            <input
              type="range"
              id="husband-ratio"
              min="0"
              max="100"
              value={husbandRatio}
              onChange={(e) => handleHusbandRatioChange(Number(e.target.value))}
              disabled={isLoading || isSaving}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>

          <div>
            <label htmlFor="wife-ratio" className="block text-sm font-medium text-gray-700 mb-2">
              妻の配分比率 (%)
            </label>
            <input
              type="range"
              id="wife-ratio"
              min="0"
              max="100"
              value={wifeRatio}
              onChange={(e) => handleWifeRatioChange(Number(e.target.value))}
              disabled={isLoading || isSaving}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>
        </div>

        {/* 説明 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-blue-800">
                設定した配分比率に基づいて、入力された費用が自動的に計算されます。
                例：3,000円の費用の場合、夫が2,100円、妻が900円の負担となります。
              </p>
            </div>
          </div>
        </div>

        {/* 保存ボタン */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isLoading || isSaving || husbandRatio + wifeRatio !== 100}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? '保存中...' : '配分比率を保存'}
          </button>
        </div>
      </form>
    </div>
  );
} 
