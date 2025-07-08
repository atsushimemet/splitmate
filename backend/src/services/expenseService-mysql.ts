import { v4 as uuidv4 } from 'uuid';
import { pool } from '../database/connection-mysql';
import { ApiResponse, CreateExpenseRequest, Expense } from '../types';

export class ExpenseService {
  /**
   * 新しい費用を登録する
   */
  static async createExpense(data: CreateExpenseRequest): Promise<ApiResponse<Expense>> {
    try {
      const id = uuidv4();
      const now = new Date();
      const mysqlDateTime = now.toISOString().slice(0, 19).replace('T', ' ');
      
      const sql = `
        INSERT INTO expenses (id, category, description, amount, payer_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;
      
      await pool.execute(sql, [id, data.category, data.description, data.amount, data.payerId, mysqlDateTime, mysqlDateTime]);
      
      // 作成された費用を取得
      const result = await ExpenseService.getExpenseById(id);
      if (result.success && result.data) {
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
      
      const [rows] = await pool.execute(sql);
      
      const expenses: Expense[] = (rows as any[]).map((row: any) => ({
        id: row.id,
        category: row.category,
        description: row.description,
        amount: row.amount,
        payerId: row.payer_id,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at)
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
   * IDで費用を取得する
   */
  static async getExpenseById(id: string): Promise<ApiResponse<Expense>> {
    try {
      const sql = `
        SELECT e.*, u.name as payer_name, u.role as payer_role
        FROM expenses e
        JOIN users u ON e.payer_id = u.id
        WHERE e.id = ?
      `;
      
      const [rows] = await pool.execute(sql, [id]);
      const row = (rows as any[])[0];
      
      if (!row) {
        return {
          success: false,
          error: 'Expense not found'
        };
      }
      
      const expense: Expense = {
        id: row.id,
        category: row.category,
        description: row.description,
        amount: row.amount,
        payerId: row.payer_id,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at)
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
      const sql = 'DELETE FROM expenses WHERE id = ?';
      
      const [result] = await pool.execute(sql, [id]);
      const affectedRows = (result as any).affectedRows;
      
      if (affectedRows === 0) {
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

      // プレースホルダーを動的に生成
      const placeholders = ids.map(() => '?').join(',');
      const sql = `DELETE FROM expenses WHERE id IN (${placeholders})`;
      
      const [result] = await pool.execute(sql, ids);
      const deletedCount = (result as any).affectedRows;
      
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
   * 費用の統計情報を取得する
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
      
      const [rows] = await pool.execute(sql);
      const row = (rows as any[])[0];
      
      return {
        success: true,
        data: {
          totalExpenses: row.total_expenses,
          totalAmount: row.total_amount,
          averageAmount: Math.round(row.average_amount),
          minAmount: row.min_amount,
          maxAmount: row.max_amount
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to fetch expense stats: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
} 
