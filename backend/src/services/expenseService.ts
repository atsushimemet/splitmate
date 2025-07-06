import { v4 as uuidv4 } from 'uuid';
import { db } from '../database/connection';
import { ApiResponse, CreateExpenseRequest, Expense } from '../types';

export class ExpenseService {
  /**
   * 新しい費用を登録する
   */
  static async createExpense(data: CreateExpenseRequest): Promise<ApiResponse<Expense>> {
    return new Promise((resolve) => {
      const id = uuidv4();
      const now = new Date().toISOString();
      
      const sql = `
        INSERT INTO expenses (id, category, description, amount, payer_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;
      
      db.run(sql, [id, data.category, data.description, data.amount, data.payerId, now, now], function(err) {
        if (err) {
          resolve({
            success: false,
            error: `Failed to create expense: ${err.message}`
          });
          return;
        }
        
        // 作成された費用を取得
        ExpenseService.getExpenseById(id).then((result) => {
          if (result.success && result.data) {
            resolve({
              success: true,
              data: result.data,
              message: 'Expense created successfully'
            });
          } else {
            resolve({
              success: false,
              error: 'Failed to retrieve created expense'
            });
          }
        });
      });
    });
  }

  /**
   * 全ての費用を取得する
   */
  static async getAllExpenses(): Promise<ApiResponse<Expense[]>> {
    return new Promise((resolve) => {
      const sql = `
        SELECT e.*, u.name as payer_name, u.role as payer_role
        FROM expenses e
        JOIN users u ON e.payer_id = u.id
        ORDER BY e.created_at DESC
      `;
      
      db.all(sql, [], (err, rows) => {
        if (err) {
          resolve({
            success: false,
            error: `Failed to fetch expenses: ${err.message}`
          });
          return;
        }
        
        const expenses: Expense[] = rows.map((row: any) => ({
          id: row.id,
          category: row.category,
          description: row.description,
          amount: row.amount,
          payerId: row.payer_id,
          createdAt: new Date(row.created_at),
          updatedAt: new Date(row.updated_at)
        }));
        
        resolve({
          success: true,
          data: expenses
        });
      });
    });
  }

  /**
   * IDで費用を取得する
   */
  static async getExpenseById(id: string): Promise<ApiResponse<Expense>> {
    return new Promise((resolve) => {
      const sql = `
        SELECT e.*, u.name as payer_name, u.role as payer_role
        FROM expenses e
        JOIN users u ON e.payer_id = u.id
        WHERE e.id = ?
      `;
      
      db.get(sql, [id], (err, row: any) => {
        if (err) {
          resolve({
            success: false,
            error: `Failed to fetch expense: ${err.message}`
          });
          return;
        }
        
        if (!row) {
          resolve({
            success: false,
            error: 'Expense not found'
          });
          return;
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
        
        resolve({
          success: true,
          data: expense
        });
      });
    });
  }

  /**
   * 費用を削除する
   */
  static async deleteExpense(id: string): Promise<ApiResponse<void>> {
    return new Promise((resolve) => {
      const sql = 'DELETE FROM expenses WHERE id = ?';
      
      db.run(sql, [id], function(err) {
        if (err) {
          resolve({
            success: false,
            error: `Failed to delete expense: ${err.message}`
          });
          return;
        }
        
        if (this.changes === 0) {
          resolve({
            success: false,
            error: 'Expense not found'
          });
          return;
        }
        
        resolve({
          success: true,
          message: 'Expense deleted successfully'
        });
      });
    });
  }

  /**
   * 費用の統計情報を取得する
   */
  static async getExpenseStats(): Promise<ApiResponse<any>> {
    return new Promise((resolve) => {
      const sql = `
        SELECT 
          COUNT(*) as total_expenses,
          SUM(amount) as total_amount,
          AVG(amount) as average_amount,
          MIN(amount) as min_amount,
          MAX(amount) as max_amount
        FROM expenses
      `;
      
      db.get(sql, [], (err, row: any) => {
        if (err) {
          resolve({
            success: false,
            error: `Failed to fetch expense stats: ${err.message}`
          });
          return;
        }
        
        resolve({
          success: true,
          data: {
            totalExpenses: row.total_expenses,
            totalAmount: row.total_amount,
            averageAmount: Math.round(row.average_amount),
            minAmount: row.min_amount,
            maxAmount: row.max_amount
          }
        });
      });
    });
  }
} 
