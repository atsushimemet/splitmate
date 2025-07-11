import { pool } from '../database/connection-postgres';
import { AllocationRatio, ApiResponse, UpdateAllocationRatioRequest } from '../types';
import { settlementService } from './settlementService-postgres';

export const allocationRatioService = {
  // 配分比率を取得
  getAllocationRatio: async (): Promise<ApiResponse<AllocationRatio>> => {
    try {
      const query = `
        SELECT id, husband_ratio as "husbandRatio", wife_ratio as "wifeRatio", 
               created_at as "createdAt", updated_at as "updatedAt"
        FROM allocation_ratios 
        ORDER BY created_at DESC 
        LIMIT 1
      `;
      
      const result = await pool.query(query);
      const row = result.rows[0];
      
      if (row) {
        return {
          success: true,
          data: {
            id: row.id,
            husbandRatio: parseFloat(row.husbandRatio),
            wifeRatio: parseFloat(row.wifeRatio),
            createdAt: new Date(row.createdAt),
            updatedAt: new Date(row.updatedAt)
          }
        };
      } else {
        // デフォルト値を返す
        return {
          success: true,
          data: {
            id: 'default',
            husbandRatio: 0.7,
            wifeRatio: 0.3,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        };
      }
    } catch (error) {
      console.error('Error getting allocation ratio:', error);
      return {
        success: false,
        error: '配分比率の取得に失敗しました'
      };
    }
  },

  // 配分比率を更新
  updateAllocationRatio: async (data: UpdateAllocationRatioRequest): Promise<ApiResponse<AllocationRatio>> => {
    try {
      const now = new Date();
      
      // 既存のレコードを削除（最新の1件のみ保持）
      await pool.query('DELETE FROM allocation_ratios');
      
      // 新しいレコードを挿入
      const insertQuery = `
        INSERT INTO allocation_ratios (id, husband_ratio, wife_ratio, created_at, updated_at)
        VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING id, husband_ratio as "husbandRatio", wife_ratio as "wifeRatio", 
                  created_at as "createdAt", updated_at as "updatedAt"
      `;
      
      const id = `ratio_${Date.now()}`;
      const result = await pool.query(insertQuery, [id, data.husbandRatio, data.wifeRatio]);
      const insertedRow = result.rows[0];
      
      // 配分比率更新後、既存の精算を再計算
      await allocationRatioService.recalculateAllSettlements();
      
      return {
        success: true,
        data: {
          id: insertedRow.id,
          husbandRatio: parseFloat(insertedRow.husbandRatio),
          wifeRatio: parseFloat(insertedRow.wifeRatio),
          createdAt: new Date(insertedRow.createdAt),
          updatedAt: new Date(insertedRow.updatedAt)
        }
      };
    } catch (error) {
      console.error('Error updating allocation ratio:', error);
      return {
        success: false,
        error: '配分比率の更新に失敗しました'
      };
    }
  },

  // 全精算を再計算
  recalculateAllSettlements: async (): Promise<void> => {
    try {
      // 全ての費用を取得
      const expenseQuery = `
        SELECT id FROM expenses ORDER BY created_at ASC
      `;
      
      const result = await pool.query(expenseQuery);
      const expenses = result.rows;
      
      // 各費用の精算を再計算
      for (const expense of expenses) {
        try {
          await settlementService.calculateSettlement(expense.id);
        } catch (error) {
          console.error(`Error recalculating settlement for expense ${expense.id}:`, error);
        }
      }
      
      console.log(`Recalculated settlements for ${expenses.length} expenses`);
    } catch (error) {
      console.error('Error recalculating all settlements:', error);
    }
  }
}; 
