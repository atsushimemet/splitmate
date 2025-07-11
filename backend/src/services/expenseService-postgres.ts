import { v4 as uuidv4 } from 'uuid';
import pool from '../database/connection-postgres';
import { ApiResponse, CreateExpenseRequest, Expense, MonthlyExpenseStats, MonthlyExpenseSummary, UpdateExpenseAllocationRatioRequest } from '../types';
import { SettlementService } from './settlementService-postgres';

export class ExpenseService {
  /**
   * 新しい費用を登録する
   */
  static async createExpense(data: CreateExpenseRequest): Promise<ApiResponse<Expense>> {
    try {
      const id = uuidv4();
      const now = new Date();
      
      // 年月の設定（指定されていない場合は現在の年月を使用）
      const expenseYear = data.expenseYear || now.getFullYear();
      const expenseMonth = data.expenseMonth || (now.getMonth() + 1);
      
      // 個別配分比率の設定
      const customHusbandRatio = data.customHusbandRatio || null;
      const customWifeRatio = data.customWifeRatio || null;
      const usesCustomRatio = data.usesCustomRatio || false;
      
      const sql = `
        INSERT INTO expenses (
          id, description, amount, payer_id, expense_year, expense_month, 
          custom_husband_ratio, custom_wife_ratio, uses_custom_ratio, 
          created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `;
      
      await pool.query(sql, [
        id, 
        data.description, 
        data.amount, 
        data.payerId, 
        expenseYear,
        expenseMonth,
        customHusbandRatio,
        customWifeRatio,
        usesCustomRatio,
        now, 
        now
      ]);
      
      // 作成された費用を取得
      const result = await ExpenseService.getExpenseById(id);
      
      if (result.success && result.data) {
        // 費用作成後、精算を自動計算
        try {
          await SettlementService.calculateSettlement(id);
        } catch (error) {
          console.error(`Error calculating settlement for expense ${id}:`, error);
          // 精算の計算が失敗しても、費用の作成は成功として扱う
        }
        
        return {
          success: true,
          data: result.data,
          message: 'Expense created successfully'
        };
      } else {
        return {
          success: false,
          error: 'Failed to retrieve created expense'
        };
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to create expense: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * 全ての費用を取得する
   */
  static async getAllExpenses(): Promise<ApiResponse<Expense[]>> {
    try {
      const sql = `
        SELECT e.*, u.name as payer_name, u.role as payer_role
        FROM expenses e
        JOIN users u ON e.payer_id = u.id
        ORDER BY e.created_at DESC
      `;
      
      const result = await pool.query(sql);
      
      const expenses: Expense[] = result.rows.map((row: any) => ({
        id: row.id,
        description: row.description,
        amount: row.amount,
        payerId: row.payer_id,
        expenseYear: row.expense_year,
        expenseMonth: row.expense_month,
        customHusbandRatio: row.custom_husband_ratio,
        customWifeRatio: row.custom_wife_ratio,
        usesCustomRatio: row.uses_custom_ratio || false,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
        payerName: row.payer_name,
        payerRole: row.payer_role
      }));
      
      return {
        success: true,
        data: expenses
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to fetch expenses: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * 指定した年月の費用を取得する
   */
  static async getExpensesByMonth(year: number, month: number): Promise<ApiResponse<Expense[]>> {
    try {
      const sql = `
        SELECT e.*, u.name as payer_name, u.role as payer_role
        FROM expenses e
        JOIN users u ON e.payer_id = u.id
        WHERE e.expense_year = $1 AND e.expense_month = $2
        ORDER BY e.created_at DESC
      `;
      
      const result = await pool.query(sql, [year, month]);
      
      const expenses: Expense[] = result.rows.map((row: any) => ({
        id: row.id,
        description: row.description,
        amount: row.amount,
        payerId: row.payer_id,
        expenseYear: row.expense_year,
        expenseMonth: row.expense_month,
        customHusbandRatio: row.custom_husband_ratio,
        customWifeRatio: row.custom_wife_ratio,
        usesCustomRatio: row.uses_custom_ratio || false,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
        payerName: row.payer_name,
        payerRole: row.payer_role
      }));
      
      return {
        success: true,
        data: expenses
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to fetch expenses by month: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * 指定した年月の費用サマリーを取得する
   */
  static async getMonthlyExpenseSummary(year: number, month: number): Promise<ApiResponse<MonthlyExpenseSummary>> {
    try {
      const sql = `
        SELECT 
          expense_year as year,
          expense_month as month,
          COUNT(*) as total_expenses,
          SUM(amount) as total_amount,
          SUM(CASE WHEN payer_id = 'husband' THEN amount ELSE 0 END) as husband_amount,
          SUM(CASE WHEN payer_id = 'wife' THEN amount ELSE 0 END) as wife_amount
        FROM expenses
        WHERE expense_year = $1 AND expense_month = $2
        GROUP BY expense_year, expense_month
      `;
      
      const result = await pool.query(sql, [year, month]);
      
      if (result.rows.length === 0) {
        return {
          success: true,
          data: {
            year,
            month,
            totalExpenses: 0,
            totalAmount: 0,
            husbandAmount: 0,
            wifeAmount: 0
          }
        };
      }
      
      const row = result.rows[0];
      const summary: MonthlyExpenseSummary = {
        year: row.year,
        month: row.month,
        totalExpenses: parseInt(row.total_expenses),
        totalAmount: parseInt(row.total_amount),
        husbandAmount: parseInt(row.husband_amount),
        wifeAmount: parseInt(row.wife_amount)
      };
      
      return {
        success: true,
        data: summary
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to fetch monthly expense summary: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * 月次費用統計を取得する
   */
  static async getMonthlyExpenseStats(year?: number, month?: number): Promise<ApiResponse<MonthlyExpenseStats>> {
    try {
      const now = new Date();
      const targetYear = year || now.getFullYear();
      const targetMonth = month || (now.getMonth() + 1);
      
      // 当月の統計
      const currentMonthResult = await ExpenseService.getMonthlyExpenseSummary(targetYear, targetMonth);
      
      // 前月の統計
      const prevMonth = targetMonth === 1 ? 12 : targetMonth - 1;
      const prevYear = targetMonth === 1 ? targetYear - 1 : targetYear;
      const previousMonthResult = await ExpenseService.getMonthlyExpenseSummary(prevYear, prevMonth);
      
      // 年間統計
      const yearSql = `
        SELECT 
          COUNT(*) as total_expenses,
          SUM(amount) as total_amount
        FROM expenses
        WHERE expense_year = $1
      `;
      
      const yearResult = await pool.query(yearSql, [targetYear]);
      const yearRow = yearResult.rows[0];
      
      const stats: MonthlyExpenseStats = {
        currentMonth: currentMonthResult.data || {
          year: targetYear,
          month: targetMonth,
          totalExpenses: 0,
          totalAmount: 0,
          husbandAmount: 0,
          wifeAmount: 0
        },
        previousMonth: previousMonthResult.data || {
          year: prevYear,
          month: prevMonth,
          totalExpenses: 0,
          totalAmount: 0,
          husbandAmount: 0,
          wifeAmount: 0
        },
        yearToDate: {
          totalExpenses: parseInt(yearRow.total_expenses) || 0,
          totalAmount: parseInt(yearRow.total_amount) || 0,
          monthlyAverages: Math.round((parseInt(yearRow.total_amount) || 0) / 12)
        }
      };
      
      return {
        success: true,
        data: stats
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to fetch monthly expense stats: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * IDで費用を取得する
   */
  static async getExpenseById(id: string): Promise<ApiResponse<Expense>> {
    try {
      const sql = `
        SELECT e.*, u.name as payer_name, u.role as payer_role
        FROM expenses e
        JOIN users u ON e.payer_id = u.id
        WHERE e.id = $1
      `;
      
      const result = await pool.query(sql, [id]);
      
      if (result.rows.length === 0) {
        return {
          success: false,
          error: 'Expense not found'
        };
      }
      
      const row = result.rows[0];
      const expense: Expense = {
        id: row.id,
        description: row.description,
        amount: row.amount,
        payerId: row.payer_id,
        expenseYear: row.expense_year,
        expenseMonth: row.expense_month,
        customHusbandRatio: row.custom_husband_ratio,
        customWifeRatio: row.custom_wife_ratio,
        usesCustomRatio: row.uses_custom_ratio || false,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
        payerName: row.payer_name,
        payerRole: row.payer_role
      };
      
      return {
        success: true,
        data: expense
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to fetch expense: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * 費用を削除する
   */
  static async deleteExpense(id: string): Promise<ApiResponse<void>> {
    try {
      const sql = 'DELETE FROM expenses WHERE id = $1';
      const result = await pool.query(sql, [id]);
      
      if (result.rowCount === 0) {
        return {
          success: false,
          error: 'Expense not found'
        };
      }
      
      return {
        success: true,
        message: 'Expense deleted successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to delete expense: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * 複数の費用を一括削除する
   */
  static async bulkDeleteExpenses(ids: string[]): Promise<ApiResponse<{ deletedCount: number }>> {
    try {
      if (ids.length === 0) {
        return {
          success: false,
          error: 'No expense IDs provided'
        };
      }

      // PostgreSQL用の動的プレースホルダーを生成
      const placeholders = ids.map((_, index) => `$${index + 1}`).join(',');
      const sql = `DELETE FROM expenses WHERE id IN (${placeholders})`;
      
      const result = await pool.query(sql, ids);
      const deletedCount = result.rowCount || 0;
      
      return {
        success: true,
        data: { deletedCount },
        message: `${deletedCount} expenses deleted successfully`
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to bulk delete expenses: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * 費用統計を取得する
   */
  static async getExpenseStats(): Promise<ApiResponse<any>> {
    try {
      const sql = `
        SELECT 
          COUNT(*) as total_expenses,
          SUM(amount) as total_amount,
          AVG(amount) as average_amount,
          MIN(amount) as min_amount,
          MAX(amount) as max_amount
        FROM expenses
      `;
      
      const result = await pool.query(sql);
      const stats = result.rows[0];
      
      return {
        success: true,
        data: {
          totalExpenses: parseInt(stats.total_expenses) || 0,
          totalAmount: parseInt(stats.total_amount) || 0,
          averageAmount: Math.round(parseFloat(stats.average_amount) || 0),
          minAmount: parseInt(stats.min_amount) || 0,
          maxAmount: parseInt(stats.max_amount) || 0
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to fetch expense stats: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * 費用の個別配分比率を更新する
   */
  static async updateExpenseAllocationRatio(
    expenseId: string, 
    data: UpdateExpenseAllocationRatioRequest
  ): Promise<ApiResponse<Expense>> {
    try {
      const now = new Date();
      
      const sql = `
        UPDATE expenses 
        SET custom_husband_ratio = $1, custom_wife_ratio = $2, uses_custom_ratio = $3, updated_at = $4
        WHERE id = $5
      `;
      
      const result = await pool.query(sql, [
        data.customHusbandRatio,
        data.customWifeRatio,
        data.usesCustomRatio,
        now,
        expenseId
      ]);
      
      const affectedRows = result.rowCount;
      
      if (affectedRows === 0) {
        return {
          success: false,
          error: 'Expense not found'
        };
      }
      
      // 個別配分比率の更新後、該当する精算を再計算
      try {
        await SettlementService.calculateSettlement(expenseId);
      } catch (error) {
        console.error(`Error recalculating settlement for expense ${expenseId}:`, error);
        // 精算の再計算が失敗しても、費用の更新は成功として扱う
      }
      
      // 更新された費用を取得
      const expenseResult = await ExpenseService.getExpenseById(expenseId);
      if (expenseResult.success && expenseResult.data) {
        return {
          success: true,
          data: expenseResult.data,
          message: 'Expense allocation ratio updated successfully'
        };
      } else {
        return {
          success: false,
          error: 'Failed to retrieve updated expense'
        };
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to update expense allocation ratio: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
} 
