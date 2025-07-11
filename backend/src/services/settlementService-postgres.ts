import { pool } from '../database/connection-postgres';
import { ApiResponse, Settlement } from '../types';
import { allocationRatioService } from './allocationRatioService-postgres';

export const settlementService = {
  // 費用の精算を計算
  calculateSettlement: async (expenseId: string): Promise<ApiResponse<Settlement>> => {
    try {
      // 費用を取得（個別配分比率を含む）
      const expenseQuery = `
        SELECT id, description, amount, payer_id as "payerId",
               custom_husband_ratio as "customHusbandRatio",
               custom_wife_ratio as "customWifeRatio",
               uses_custom_ratio as "usesCustomRatio",
               created_at as "createdAt", updated_at as "updatedAt"
        FROM expenses 
        WHERE id = $1
      `;
      
      const expenseResult = await pool.query(expenseQuery, [expenseId]);
      const expense = expenseResult.rows[0];

      if (!expense) {
        return {
          success: false,
          error: '費用が見つかりません'
        };
      }

      // 配分比率を決定（個別配分比率 or 全体配分比率）
      let husbandRatio: number;
      let wifeRatio: number;

      if (expense.usesCustomRatio && expense.customHusbandRatio !== null && expense.customWifeRatio !== null) {
        // 個別配分比率を使用
        husbandRatio = parseFloat(expense.customHusbandRatio);
        wifeRatio = parseFloat(expense.customWifeRatio);
      } else {
        // 全体配分比率を取得
        const ratioResponse = await allocationRatioService.getAllocationRatio();
        if (!ratioResponse.success || !ratioResponse.data) {
          return {
            success: false,
            error: '配分比率の取得に失敗しました'
          };
        }
        husbandRatio = ratioResponse.data.husbandRatio;
        wifeRatio = ratioResponse.data.wifeRatio;
      }
      
      // 精算金額を計算
      const husbandAmount = Math.round(expense.amount * husbandRatio);
      const wifeAmount = Math.round(expense.amount * wifeRatio);
      
      // 支払者を取得（入力者から）
      const userQuery = `
        SELECT role FROM users WHERE id = $1
      `;
      
      const userResult = await pool.query(userQuery, [expense.payerId]);
      const user = userResult.rows[0];

      if (!user) {
        return {
          success: false,
          error: '支払者の情報が見つかりません'
        };
      }

      // 立替者と受取者を決定（入力者が立替者）
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
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT (id) DO UPDATE SET
        husband_amount = EXCLUDED.husband_amount,
        wife_amount = EXCLUDED.wife_amount,
        payer = EXCLUDED.payer,
        receiver = EXCLUDED.receiver,
        settlement_amount = EXCLUDED.settlement_amount,
        status = EXCLUDED.status,
        updated_at = CURRENT_TIMESTAMP
        RETURNING id, expense_id as "expenseId", husband_amount as "husbandAmount", wife_amount as "wifeAmount",
                  payer, receiver, settlement_amount as "settlementAmount", status,
                  created_at as "createdAt", updated_at as "updatedAt"
      `;
      
      const result = await pool.query(upsertQuery, [
        settlementId,
        expenseId,
        husbandAmount,
        wifeAmount,
        payer,
        receiver,
        settlementAmount
      ]);

      const settlementRow = result.rows[0];

      return {
        success: true,
        data: {
          id: settlementRow.id,
          expenseId: settlementRow.expenseId,
          husbandAmount: settlementRow.husbandAmount,
          wifeAmount: settlementRow.wifeAmount,
          payer: settlementRow.payer,
          receiver: settlementRow.receiver,
          settlementAmount: settlementRow.settlementAmount,
          status: settlementRow.status,
          createdAt: new Date(settlementRow.createdAt),
          updatedAt: new Date(settlementRow.updatedAt),
          expenseDescription: expense.description,
          expenseAmount: expense.amount,
          customHusbandRatio: expense.customHusbandRatio ? parseFloat(expense.customHusbandRatio) : null,
          customWifeRatio: expense.customWifeRatio ? parseFloat(expense.customWifeRatio) : null,
          usesCustomRatio: expense.usesCustomRatio || false
        }
      };
    } catch (error) {
      console.error('Error calculating settlement:', error);
      return {
        success: false,
        error: '精算計算に失敗しました'
      };
    }
  },

  // 精算を承認
  approveSettlement: async (settlementId: string): Promise<ApiResponse<Settlement>> => {
    try {
      const updateQuery = `
        UPDATE settlements 
        SET status = 'approved', updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `;
      
      await pool.query(updateQuery, [settlementId]);

      // 更新された精算を取得
      const getQuery = `
        SELECT s.id, s.expense_id as "expenseId", s.husband_amount as "husbandAmount", 
               s.wife_amount as "wifeAmount", s.payer, s.receiver, s.settlement_amount as "settlementAmount",
               s.status, s.created_at as "createdAt", s.updated_at as "updatedAt",
               e.description as "expenseDescription", e.amount as "expenseAmount",
               e.custom_husband_ratio as "customHusbandRatio", e.custom_wife_ratio as "customWifeRatio",
               e.uses_custom_ratio as "usesCustomRatio"
        FROM settlements s
        JOIN expenses e ON s.expense_id = e.id
        WHERE s.id = $1
      `;
      
      const result = await pool.query(getQuery, [settlementId]);
      const row = result.rows[0];

      if (!row) {
        return {
          success: false,
          error: '精算が見つかりません'
        };
      }

      return {
        success: true,
        data: {
          id: row.id,
          expenseId: row.expenseId,
          husbandAmount: row.husbandAmount,
          wifeAmount: row.wifeAmount,
          payer: row.payer,
          receiver: row.receiver,
          settlementAmount: row.settlementAmount,
          status: row.status,
          createdAt: new Date(row.createdAt),
          updatedAt: new Date(row.updatedAt),
          expenseDescription: row.expenseDescription,
          expenseAmount: row.expenseAmount,
          customHusbandRatio: row.customHusbandRatio ? parseFloat(row.customHusbandRatio) : null,
          customWifeRatio: row.customWifeRatio ? parseFloat(row.customWifeRatio) : null,
          usesCustomRatio: row.usesCustomRatio || false
        }
      };
    } catch (error) {
      console.error('Error approving settlement:', error);
      return {
        success: false,
        error: '精算の承認に失敗しました'
      };
    }
  },

  // 精算を完了
  completeSettlement: async (settlementId: string): Promise<ApiResponse<Settlement>> => {
    try {
      const updateQuery = `
        UPDATE settlements 
        SET status = 'completed', updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `;
      
      await pool.query(updateQuery, [settlementId]);

      // 更新された精算を取得
      const getQuery = `
        SELECT s.id, s.expense_id as "expenseId", s.husband_amount as "husbandAmount", 
               s.wife_amount as "wifeAmount", s.payer, s.receiver, s.settlement_amount as "settlementAmount",
               s.status, s.created_at as "createdAt", s.updated_at as "updatedAt",
               e.description as "expenseDescription", e.amount as "expenseAmount",
               e.custom_husband_ratio as "customHusbandRatio", e.custom_wife_ratio as "customWifeRatio",
               e.uses_custom_ratio as "usesCustomRatio"
        FROM settlements s
        JOIN expenses e ON s.expense_id = e.id
        WHERE s.id = $1
      `;
      
      const result = await pool.query(getQuery, [settlementId]);
      const row = result.rows[0];

      if (!row) {
        return {
          success: false,
          error: '精算が見つかりません'
        };
      }

      return {
        success: true,
        data: {
          id: row.id,
          expenseId: row.expenseId,
          husbandAmount: row.husbandAmount,
          wifeAmount: row.wifeAmount,
          payer: row.payer,
          receiver: row.receiver,
          settlementAmount: row.settlementAmount,
          status: row.status,
          createdAt: new Date(row.createdAt),
          updatedAt: new Date(row.updatedAt),
          expenseDescription: row.expenseDescription,
          expenseAmount: row.expenseAmount,
          customHusbandRatio: row.customHusbandRatio ? parseFloat(row.customHusbandRatio) : null,
          customWifeRatio: row.customWifeRatio ? parseFloat(row.customWifeRatio) : null,
          usesCustomRatio: row.usesCustomRatio || false
        }
      };
    } catch (error) {
      console.error('Error completing settlement:', error);
      return {
        success: false,
        error: '精算の完了に失敗しました'
      };
    }
  },

  // 全ての精算を取得
  getAllSettlements: async (): Promise<ApiResponse<Settlement[]>> => {
    try {
      const query = `
        SELECT s.id, s.expense_id as "expenseId", s.husband_amount as "husbandAmount",
               s.wife_amount as "wifeAmount", s.payer, s.receiver, s.settlement_amount as "settlementAmount",
               s.status, s.created_at as "createdAt", s.updated_at as "updatedAt",
               e.description as "expenseDescription", e.amount as "expenseAmount",
               e.custom_husband_ratio as "customHusbandRatio", e.custom_wife_ratio as "customWifeRatio",
               e.uses_custom_ratio as "usesCustomRatio"
        FROM settlements s
        JOIN expenses e ON s.expense_id = e.id
        ORDER BY s.created_at DESC
      `;
      
      const result = await pool.query(query);
      
      const settlements: Settlement[] = result.rows.map((row: any) => ({
        id: row.id,
        expenseId: row.expenseId,
        husbandAmount: row.husbandAmount,
        wifeAmount: row.wifeAmount,
        payer: row.payer,
        receiver: row.receiver,
        settlementAmount: row.settlementAmount,
        status: row.status,
        createdAt: new Date(row.createdAt),
        updatedAt: new Date(row.updatedAt),
        expenseDescription: row.expenseDescription,
        expenseAmount: row.expenseAmount,
        customHusbandRatio: row.customHusbandRatio ? parseFloat(row.customHusbandRatio) : null,
        customWifeRatio: row.customWifeRatio ? parseFloat(row.customWifeRatio) : null,
        usesCustomRatio: row.usesCustomRatio || false
      }));
      
      return {
        success: true,
        data: settlements
      };
    } catch (error) {
      console.error('Error getting settlements:', error);
      return {
        success: false,
        error: '精算の取得に失敗しました'
      };
    }
  },

  // 精算を削除
  deleteSettlement: async (settlementId: string): Promise<ApiResponse<void>> => {
    try {
      const query = 'DELETE FROM settlements WHERE id = $1';
      
      const result = await pool.query(query, [settlementId]);
      const affectedRows = result.rowCount;
      
      if (affectedRows === 0) {
        return {
          success: false,
          error: '精算が見つかりません'
        };
      }
      
      return {
        success: true,
        message: '精算を削除しました'
      };
    } catch (error) {
      console.error('Error deleting settlement:', error);
      return {
        success: false,
        error: '精算の削除に失敗しました'
      };
    }
  }
}; 
