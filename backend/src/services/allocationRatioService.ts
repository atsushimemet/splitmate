import { db } from '../database/connection';
import { AllocationRatio, ApiResponse, UpdateAllocationRatioRequest } from '../types';

export const allocationRatioService = {
  // 配分比率を取得
  getAllocationRatio: async (): Promise<ApiResponse<AllocationRatio>> => {
    try {
      const query = `
        SELECT id, husband_ratio as husbandRatio, wife_ratio as wifeRatio, 
               created_at as createdAt, updated_at as updatedAt
        FROM allocation_ratios 
        ORDER BY created_at DESC 
        LIMIT 1
      `;
      
      const result = await new Promise<any>((resolve, reject) => {
        db.get(query, (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });
      
      if (result) {
        return {
          success: true,
          data: {
            id: result.id,
            husbandRatio: result.husbandRatio,
            wifeRatio: result.wifeRatio,
            createdAt: new Date(result.createdAt),
            updatedAt: new Date(result.updatedAt)
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
      const now = new Date().toISOString();
      
      // 既存のレコードを削除（最新の1件のみ保持）
      await new Promise<void>((resolve, reject) => {
        db.run('DELETE FROM allocation_ratios', (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      
      // 新しいレコードを挿入
      const insertQuery = `
        INSERT INTO allocation_ratios (id, husband_ratio, wife_ratio, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
      `;
      
      const id = `ratio_${Date.now()}`;
      await new Promise<void>((resolve, reject) => {
        db.run(insertQuery, [id, data.husbandRatio, data.wifeRatio, now, now], (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      
      return {
        success: true,
        data: {
          id,
          husbandRatio: data.husbandRatio,
          wifeRatio: data.wifeRatio,
          createdAt: new Date(now),
          updatedAt: new Date(now)
        }
      };
    } catch (error) {
      console.error('Error updating allocation ratio:', error);
      return {
        success: false,
        error: '配分比率の更新に失敗しました'
      };
    }
  }
}; 
