import { db } from '../database/connection';
import { ApiResponse, Settlement } from '../types';
import { allocationRatioService } from './allocationRatioService';

export const settlementService = {
  // 費用の精算を計算
  calculateSettlement: async (expenseId: string): Promise<ApiResponse<Settlement>> => {
    try {
      // 費用を取得
      const expenseQuery = `
        SELECT id, category, description, amount, payer_id as payerId,
               created_at as createdAt, updated_at as updatedAt
        FROM expenses 
        WHERE id = ?
      `;
      
      const expense = await new Promise<any>((resolve, reject) => {
        db.get(expenseQuery, [expenseId], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });

      if (!expense) {
        return {
          success: false,
          error: '費用が見つかりません'
        };
      }

      // 配分比率を取得
      const ratioResponse = await allocationRatioService.getAllocationRatio();
      if (!ratioResponse.success || !ratioResponse.data) {
        return {
          success: false,
          error: '配分比率の取得に失敗しました'
        };
      }

      const ratio = ratioResponse.data;
      
      // 精算金額を計算
      const husbandAmount = Math.round(expense.amount * ratio.husbandRatio);
      const wifeAmount = Math.round(expense.amount * ratio.wifeRatio);
      
      // 支払者を取得（入力者から）
      const userQuery = `
        SELECT role FROM users WHERE id = ?
      `;
      
      const user = await new Promise<any>((resolve, reject) => {
        db.get(userQuery, [expense.payerId], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });

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
      const now = new Date().toISOString();
      const settlementId = `settlement_${expenseId}`;
      
      const upsertQuery = `
        INSERT OR REPLACE INTO settlements 
        (id, expense_id, husband_amount, wife_amount, payer, receiver, settlement_amount, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)
      `;
      
      await new Promise<void>((resolve, reject) => {
        db.run(upsertQuery, [
          settlementId,
          expenseId,
          husbandAmount,
          wifeAmount,
          payer,
          receiver,
          settlementAmount,
          now,
          now
        ], (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      return {
        success: true,
        data: {
          id: settlementId,
          expenseId,
          husbandAmount,
          wifeAmount,
          payer,
          receiver,
          settlementAmount,
          status: 'pending',
          createdAt: new Date(now),
          updatedAt: new Date(now)
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
        SET status = 'approved', updated_at = ?
        WHERE id = ?
      `;
      
      await new Promise<void>((resolve, reject) => {
        db.run(updateQuery, [new Date().toISOString(), settlementId], (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      // 更新された精算を取得
      const getQuery = `
        SELECT id, expense_id as expenseId, husband_amount as husbandAmount, 
               wife_amount as wifeAmount, payer, receiver, settlement_amount as settlementAmount,
               status, created_at as createdAt, updated_at as updatedAt
        FROM settlements 
        WHERE id = ?
      `;
      
      const result = await new Promise<any>((resolve, reject) => {
        db.get(getQuery, [settlementId], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });

      if (!result) {
        return {
          success: false,
          error: '精算が見つかりません'
        };
      }

      return {
        success: true,
        data: {
          id: result.id,
          expenseId: result.expenseId,
          husbandAmount: result.husbandAmount,
          wifeAmount: result.wifeAmount,
          payer: result.payer,
          receiver: result.receiver,
          settlementAmount: result.settlementAmount,
          status: result.status,
          createdAt: new Date(result.createdAt),
          updatedAt: new Date(result.updatedAt)
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
        SET status = 'completed', updated_at = ?
        WHERE id = ?
      `;
      
      await new Promise<void>((resolve, reject) => {
        db.run(updateQuery, [new Date().toISOString(), settlementId], (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      // 更新された精算を取得
      const getQuery = `
        SELECT id, expense_id as expenseId, husband_amount as husbandAmount, 
               wife_amount as wifeAmount, payer, receiver, settlement_amount as settlementAmount,
               status, created_at as createdAt, updated_at as updatedAt
        FROM settlements 
        WHERE id = ?
      `;
      
      const result = await new Promise<any>((resolve, reject) => {
        db.get(getQuery, [settlementId], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });

      if (!result) {
        return {
          success: false,
          error: '精算が見つかりません'
        };
      }

      return {
        success: true,
        data: {
          id: result.id,
          expenseId: result.expenseId,
          husbandAmount: result.husbandAmount,
          wifeAmount: result.wifeAmount,
          payer: result.payer,
          receiver: result.receiver,
          settlementAmount: result.settlementAmount,
          status: result.status,
          createdAt: new Date(result.createdAt),
          updatedAt: new Date(result.updatedAt)
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

  // 精算一覧を取得
  getAllSettlements: async (): Promise<ApiResponse<Settlement[]>> => {
    try {
      // 現在の配分比率を取得
      const ratioResponse = await allocationRatioService.getAllocationRatio();
      if (!ratioResponse.success || !ratioResponse.data) {
        return {
          success: false,
          error: '配分比率の取得に失敗しました'
        };
      }

      const ratio = ratioResponse.data;

      const query = `
        SELECT s.id, s.expense_id as expenseId, s.husband_amount as husbandAmount, 
               s.wife_amount as wifeAmount, s.payer, s.receiver, s.settlement_amount as settlementAmount,
               s.status, s.created_at as createdAt, s.updated_at as updatedAt,
               e.category, e.description, e.amount
        FROM settlements s
        JOIN expenses e ON s.expense_id = e.id
        ORDER BY s.created_at DESC
      `;
      
      const results = await new Promise<any[]>((resolve, reject) => {
        db.all(query, (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });

      // 現在の配分比率で再計算
      const settlements = results.map(row => {
        const husbandAmount = Math.round(row.amount * ratio.husbandRatio);
        const wifeAmount = Math.round(row.amount * ratio.wifeRatio);
        
        // 精算金額は立替者ではない方の負担金額
        const settlementAmount = row.payer === 'husband' ? wifeAmount : husbandAmount;

        return {
          id: row.id,
          expenseId: row.expenseId,
          husbandAmount: husbandAmount,
          wifeAmount: wifeAmount,
          payer: row.payer,
          receiver: row.receiver,
          settlementAmount: settlementAmount,
          status: row.status,
          createdAt: new Date(row.createdAt),
          updatedAt: new Date(row.updatedAt)
        };
      });

      return {
        success: true,
        data: settlements
      };
    } catch (error) {
      console.error('Error getting settlements:', error);
      return {
        success: false,
        error: '精算一覧の取得に失敗しました'
      };
    }
  }
}; 
