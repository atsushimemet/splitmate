import pool from '../database/connection-postgres';
import { ApiResponse, Settlement } from '../types';
import { AllocationRatioService } from './allocationRatioService-postgres';

export class SettlementService {
  /**
   * 費用の精算を計算
   */
  static async calculateSettlement(expenseId: string): Promise<ApiResponse<Settlement>> {
    try {
      // 費用を取得（個別配分比率を含む）
      const expenseQuery = `
        SELECT id, description, amount, payer_id,
               custom_husband_ratio, custom_wife_ratio, uses_custom_ratio,
               created_at, updated_at
        FROM expenses 
        WHERE id = $1
      `;
      
      const expenseResult = await pool.query(expenseQuery, [expenseId]);
      const expense = expenseResult.rows[0];

      if (!expense) {
        return {
          success: false,
          error: 'Expense not found'
        };
      }

      // 配分比率を決定（個別配分比率 or 全体配分比率）
      let husbandRatio: number;
      let wifeRatio: number;

      if (expense.uses_custom_ratio && expense.custom_husband_ratio !== null && expense.custom_wife_ratio !== null) {
        // 個別配分比率を使用
        husbandRatio = parseFloat(expense.custom_husband_ratio);
        wifeRatio = parseFloat(expense.custom_wife_ratio);
      } else {
        // 全体配分比率を取得
        const ratioResponse = await AllocationRatioService.getDefaultAllocationRatio();
        if (!ratioResponse.success || !ratioResponse.data) {
          return {
            success: false,
            error: 'Failed to get allocation ratio'
          };
        }
        husbandRatio = ratioResponse.data.husbandRatio;
        wifeRatio = ratioResponse.data.wifeRatio;
      }
      
      // 精算金額を計算
      const husbandAmount = Math.round(expense.amount * husbandRatio);
      const wifeAmount = Math.round(expense.amount * wifeRatio);
      
      // 支払者を取得
      const userQuery = `
        SELECT role FROM users WHERE id = $1
      `;
      
      const userResult = await pool.query(userQuery, [expense.payer_id]);
      const user = userResult.rows[0];

      if (!user) {
        return {
          success: false,
          error: 'Payer not found'
        };
      }

      // 立替者と受取者を決定
      const payer = user.role; // 'husband' または 'wife'
      const receiver = payer === 'husband' ? 'wife' : 'husband';
      
      // 精算金額は立替者ではない方の負担金額
      const settlementAmount = payer === 'husband' ? wifeAmount : husbandAmount;

      // 精算レコードを作成または更新
      const settlementId = `settlement_${expenseId}`;
      
      // PostgreSQLではINSERT ... ON CONFLICTを使用
      const upsertQuery = `
        INSERT INTO settlements 
        (id, expense_id, husband_amount, wife_amount, payer, receiver, settlement_amount, status, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', $8, $9)
        ON CONFLICT (id) DO UPDATE SET
        husband_amount = EXCLUDED.husband_amount,
        wife_amount = EXCLUDED.wife_amount,
        payer = EXCLUDED.payer,
        receiver = EXCLUDED.receiver,
        settlement_amount = EXCLUDED.settlement_amount,
        status = EXCLUDED.status,
        updated_at = EXCLUDED.updated_at
        RETURNING *
      `;
      
      const now = new Date();
      const result = await pool.query(upsertQuery, [
        settlementId,
        expenseId,
        husbandAmount,
        wifeAmount,
        payer,
        receiver,
        settlementAmount,
        now,
        now
      ]);

      const settlementRow = result.rows[0];

      const settlement: Settlement = {
        id: settlementRow.id,
        expenseId: settlementRow.expense_id,
        husbandAmount: settlementRow.husband_amount,
        wifeAmount: settlementRow.wife_amount,
        payer: settlementRow.payer,
        receiver: settlementRow.receiver,
        settlementAmount: settlementRow.settlement_amount,
        status: settlementRow.status,
        createdAt: new Date(settlementRow.created_at),
        updatedAt: new Date(settlementRow.updated_at),
        expenseDescription: expense.description,
        expenseAmount: expense.amount,
        customHusbandRatio: expense.custom_husband_ratio ? parseFloat(expense.custom_husband_ratio) : null,
        customWifeRatio: expense.custom_wife_ratio ? parseFloat(expense.custom_wife_ratio) : null,
        usesCustomRatio: expense.uses_custom_ratio || false
      };

      return {
        success: true,
        data: settlement
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to calculate settlement: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * 全ての精算を取得する
   */
  static async getAllSettlements(): Promise<ApiResponse<Settlement[]>> {
    try {
      const sql = `
        SELECT s.*, 
               e.description as expense_description, 
               e.amount as expense_amount,
               e.custom_husband_ratio,
               e.custom_wife_ratio,
               e.uses_custom_ratio
        FROM settlements s
        JOIN expenses e ON s.expense_id = e.id
        ORDER BY s.created_at DESC
      `;
      
      const result = await pool.query(sql);
      
      const settlements: Settlement[] = result.rows.map((row: any) => ({
        id: row.id,
        expenseId: row.expense_id,
        husbandAmount: row.husband_amount,
        wifeAmount: row.wife_amount,
        payer: row.payer,
        receiver: row.receiver,
        settlementAmount: row.settlement_amount,
        status: row.status,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
        expenseDescription: row.expense_description,
        expenseAmount: row.expense_amount,
        customHusbandRatio: row.custom_husband_ratio ? parseFloat(row.custom_husband_ratio) : null,
        customWifeRatio: row.custom_wife_ratio ? parseFloat(row.custom_wife_ratio) : null,
        usesCustomRatio: row.uses_custom_ratio || false
      }));
      
      return {
        success: true,
        data: settlements
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to fetch settlements: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * 精算のステータスを更新する
   */
  static async updateSettlementStatus(id: string, status: 'pending' | 'approved' | 'completed'): Promise<ApiResponse<Settlement>> {
    try {
      const sql = `
        UPDATE settlements 
        SET status = $1, updated_at = $2
        WHERE id = $3
        RETURNING *
      `;
      
      const result = await pool.query(sql, [status, new Date(), id]);
      
      if (result.rows.length === 0) {
        return {
          success: false,
          error: 'Settlement not found'
        };
      }
      
      const row = result.rows[0];
      const settlement: Settlement = {
        id: row.id,
        expenseId: row.expense_id,
        husbandAmount: row.husband_amount,
        wifeAmount: row.wife_amount,
        payer: row.payer,
        receiver: row.receiver,
        settlementAmount: row.settlement_amount,
        status: row.status,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
        customHusbandRatio: row.custom_husband_ratio,
        customWifeRatio: row.custom_wife_ratio,
        usesCustomRatio: row.uses_custom_ratio || false
      };
      
      return {
        success: true,
        data: settlement,
        message: 'Settlement status updated successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to update settlement status: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
} 
