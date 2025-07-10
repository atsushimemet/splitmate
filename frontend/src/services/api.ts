import axios from 'axios';
import { AllocationRatio, ApiResponse, CreateExpenseRequest, Expense, ExpenseStats, MonthlyExpenseStats, MonthlyExpenseSummary, Settlement, UpdateAllocationRatioRequest, UpdateExpenseAllocationRatioRequest } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // CORSリクエストでクッキーを送信
});

// 認証用のベースクライアント（/apiパスを含まない）
const authApi = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// エラーレスポンスを整形するヘルパー関数
const formatError = (error: any, defaultMessage: string): ApiResponse<any> => {
  return {
    success: false,
    error: error.response?.data?.error || defaultMessage
  };
};

export const expenseApi = {
  // 費用を作成
  createExpense: async (data: CreateExpenseRequest): Promise<ApiResponse<Expense>> => {
    try {
      console.log('Creating expense with data:', data);
      console.log('API base URL:', api.defaults.baseURL);
      const response = await api.post('/expenses', data);
      console.log('Expense created successfully:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('Error creating expense:', error);
      console.error('Error response:', error.response?.data);
      return formatError(error, '費用の作成に失敗しました');
    }
  },

  // 全ての費用を取得
  getAllExpenses: async (): Promise<ApiResponse<Expense[]>> => {
    try {
      const response = await api.get('/expenses');
      return response.data;
    } catch (error: any) {
      return formatError(error, '費用の取得に失敗しました');
    }
  },

  // 指定した年月の費用を取得
  getExpensesByMonth: async (year: number, month: number): Promise<ApiResponse<Expense[]>> => {
    try {
      const response = await api.get(`/expenses/monthly/${year}/${month}`);
      return response.data;
    } catch (error: any) {
      return formatError(error, '月次費用の取得に失敗しました');
    }
  },

  // 指定した年月の費用サマリーを取得
  getMonthlyExpenseSummary: async (year: number, month: number): Promise<ApiResponse<MonthlyExpenseSummary>> => {
    try {
      const response = await api.get(`/expenses/monthly/${year}/${month}/summary`);
      return response.data;
    } catch (error: any) {
      return formatError(error, '月次費用サマリーの取得に失敗しました');
    }
  },

  // 月次費用統計情報を取得
  getMonthlyExpenseStats: async (year?: number, month?: number): Promise<ApiResponse<MonthlyExpenseStats>> => {
    try {
      const params = new URLSearchParams();
      if (year !== undefined) params.append('year', year.toString());
      if (month !== undefined) params.append('month', month.toString());
      
      const queryString = params.toString();
      const url = queryString ? `/expenses/monthly/stats?${queryString}` : '/expenses/monthly/stats';
      
      const response = await api.get(url);
      return response.data;
    } catch (error: any) {
      return formatError(error, '月次費用統計の取得に失敗しました');
    }
  },

  // 費用を削除
  deleteExpense: async (id: string): Promise<ApiResponse<void>> => {
    try {
      const response = await api.delete(`/expenses/${id}`);
      return response.data;
    } catch (error: any) {
      return formatError(error, '費用の削除に失敗しました');
    }
  },

  // 複数の費用を一括削除
  bulkDeleteExpenses: async (ids: string[]): Promise<ApiResponse<{ deletedCount: number }>> => {
    try {
      const response = await api.delete('/expenses/bulk', {
        data: { ids }
      });
      return response.data;
    } catch (error: any) {
      return formatError(error, '費用の一括削除に失敗しました');
    }
  },

  // 統計情報を取得
  getStats: async (): Promise<ApiResponse<ExpenseStats>> => {
    try {
      const response = await api.get('/expenses/stats');
      return response.data;
    } catch (error: any) {
      return formatError(error, '統計情報の取得に失敗しました');
    }
  },

  // 費用の個別配分比率を更新
  updateExpenseAllocationRatio: async (expenseId: string, data: UpdateExpenseAllocationRatioRequest): Promise<ApiResponse<Expense>> => {
    try {
      const response = await api.put(`/expenses/${expenseId}/allocation-ratio`, data);
      return response.data;
    } catch (error: any) {
      return formatError(error, '費用の配分比率更新に失敗しました');
    }
  }
};

export const allocationApi = {
  // 配分比率を取得
  getAllocationRatio: async (): Promise<ApiResponse<AllocationRatio>> => {
    try {
      const response = await api.get('/allocation-ratio');
      return response.data;
    } catch (error: any) {
      return formatError(error, '配分比率の取得に失敗しました');
    }
  },

  // 配分比率を更新
  updateAllocationRatio: async (data: UpdateAllocationRatioRequest): Promise<ApiResponse<AllocationRatio>> => {
    try {
      const response = await api.put('/allocation-ratio', data);
      return response.data;
    } catch (error: any) {
      return formatError(error, '配分比率の更新に失敗しました');
    }
  }
};

export const settlementApi = {
  // 精算一覧を取得
  getAllSettlements: async (): Promise<ApiResponse<Settlement[]>> => {
    try {
      const response = await api.get('/settlements');
      return response.data;
    } catch (error: any) {
      return formatError(error, '精算一覧の取得に失敗しました');
    }
  },

  // 精算を計算
  calculateSettlement: async (expenseId: string): Promise<ApiResponse<Settlement>> => {
    try {
      const response = await api.post(`/settlements/calculate/${expenseId}`);
      return response.data;
    } catch (error: any) {
      return formatError(error, '精算計算に失敗しました');
    }
  },

  // 精算を承認
  approveSettlement: async (settlementId: string): Promise<ApiResponse<Settlement>> => {
    try {
      const response = await api.put(`/settlements/${settlementId}/approve`);
      return response.data;
    } catch (error: any) {
      return formatError(error, '精算の承認に失敗しました');
    }
  },

  // 精算を完了
  completeSettlement: async (settlementId: string): Promise<ApiResponse<Settlement>> => {
    try {
      const response = await api.put(`/settlements/${settlementId}/complete`);
      return response.data;
    } catch (error: any) {
      return formatError(error, '精算の完了に失敗しました');
    }
  }
};

// 認証関連のAPI
export const auth = {
  // 認証状態を確認
  checkAuthStatus: async (): Promise<{ authenticated: boolean; user?: any }> => {
    try {
      const response = await authApi.get('/auth/status');
      return response.data;
    } catch (error: any) {
      console.error('Auth status check failed:', error);
      return { authenticated: false };
    }
  },

  // Googleログインページにリダイレクト
  loginWithGoogle: () => {
    window.location.href = `${API_BASE_URL}/auth/google`;
  },

  // ログアウト
  logout: async (): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await authApi.get('/auth/logout');
      return response.data;
    } catch (error: any) {
      console.error('Logout failed:', error);
      return { 
        success: false, 
        error: error.response?.data?.error || 'ログアウトに失敗しました'
      };
    }
  }
}; 
