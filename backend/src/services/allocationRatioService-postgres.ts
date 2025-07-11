import pool from '../database/connection-postgres';
import { AllocationRatio, ApiResponse, UpdateAllocationRatioRequest } from '../types';

export class AllocationRatioService {
  /**
   * デフォルトの配分比率を取得する
   */
  static async getDefaultAllocationRatio(): Promise<ApiResponse<AllocationRatio>> {
    try {
      const sql = `
        SELECT * FROM allocation_ratios 
        WHERE id = 'default'
        ORDER BY created_at DESC 
        LIMIT 1
      `;
      
      const result = await pool.query(sql);
      
      if (result.rows.length === 0) {
        return {
          success: false,
          error: 'Default allocation ratio not found'
        };
      }
      
      const row = result.rows[0];
      const allocationRatio: AllocationRatio = {
        id: row.id,
        husbandRatio: parseFloat(row.husband_ratio),
        wifeRatio: parseFloat(row.wife_ratio),
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at)
      };
      
      return {
        success: true,
        data: allocationRatio
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to fetch allocation ratio: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * デフォルトの配分比率を更新する
   */
  static async updateDefaultAllocationRatio(data: UpdateAllocationRatioRequest): Promise<ApiResponse<AllocationRatio>> {
    try {
      const sql = `
        UPDATE allocation_ratios 
        SET husband_ratio = $1, wife_ratio = $2, updated_at = $3
        WHERE id = 'default'
        RETURNING *
      `;
      
      const result = await pool.query(sql, [
        data.husbandRatio,
        data.wifeRatio,
        new Date()
      ]);
      
      if (result.rows.length === 0) {
        return {
          success: false,
          error: 'Default allocation ratio not found'
        };
      }
      
      const row = result.rows[0];
      const allocationRatio: AllocationRatio = {
        id: row.id,
        husbandRatio: parseFloat(row.husband_ratio),
        wifeRatio: parseFloat(row.wife_ratio),
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at)
      };
      
      return {
        success: true,
        data: allocationRatio,
        message: 'Allocation ratio updated successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to update allocation ratio: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
} 
