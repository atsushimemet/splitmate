import axios from 'axios';
import { AllocationRatio, ApiResponse, CreateExpenseRequest, Expense, ExpenseStats, Settlement, UpdateAllocationRatioRequest } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const expenseApi = {
  // 費用を作成
  createExpense: async (data: CreateExpenseRequest): Promise<ApiResponse<Expense>> => {
    try {
      const response = await api.post('/expenses', data);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || '費用の作成に失敗しました'
      };
    }
  },

  // 全ての費用を取得
  getAllExpenses: async (): Promise<ApiResponse<Expense[]>> => {
    try {
      const response = await api.get('/expenses');
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || '費用の取得に失敗しました'
      };
    }
  },

  // 費用を削除
  deleteExpense: async (id: string): Promise<ApiResponse<void>> => {
    try {
      const response = await api.delete(`/expenses/${id}`);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || '費用の削除に失敗しました'
      };
    }
  },

  // 統計情報を取得
  getStats: async (): Promise<ApiResponse<ExpenseStats>> => {
    try {
      const response = await api.get('/expenses/stats');
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || '統計情報の取得に失敗しました'
      };
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
      return {
        success: false,
        error: error.response?.data?.error || '配分比率の取得に失敗しました'
      };
    }
  },

  // 配分比率を更新
  updateAllocationRatio: async (data: UpdateAllocationRatioRequest): Promise<ApiResponse<AllocationRatio>> => {
    try {
      const response = await api.put('/allocation-ratio', data);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || '配分比率の更新に失敗しました'
      };
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
      return {
        success: false,
        error: error.response?.data?.error || '精算一覧の取得に失敗しました'
      };
    }
  },

  // 精算を計算
  calculateSettlement: async (expenseId: string): Promise<ApiResponse<Settlement>> => {
    try {
      const response = await api.post(`/settlements/calculate/${expenseId}`);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || '精算計算に失敗しました'
      };
    }
  },

  // 精算を承認
  approveSettlement: async (settlementId: string): Promise<ApiResponse<Settlement>> => {
    try {
      const response = await api.put(`/settlements/${settlementId}/approve`);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || '精算の承認に失敗しました'
      };
    }
  },

  // 精算を完了
  completeSettlement: async (settlementId: string): Promise<ApiResponse<Settlement>> => {
    try {
      const response = await api.put(`/settlements/${settlementId}/complete`);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || '精算の完了に失敗しました'
      };
    }
  }
}; 
