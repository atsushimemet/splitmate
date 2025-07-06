import { Request, Response } from 'express';
import { z } from 'zod';
import { ExpenseService } from '../services/expenseService';

// バリデーションスキーマ
const createExpenseSchema = z.object({
  category: z.string().min(1, 'Category is required'),
  description: z.string().min(1, 'Description is required'),
  amount: z.number().positive('Amount must be positive'),
  enteredBy: z.string().min(1, 'Entered by is required')
});

export class ExpenseController {
  /**
   * 新しい費用を登録
   */
  static async createExpense(req: Request, res: Response) {
    try {
      const validationResult = createExpenseSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: validationResult.error.errors
        });
      }

      const result = await ExpenseService.createExpense(validationResult.data);
      
      if (result.success) {
        res.status(201).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('Error creating expense:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * 全ての費用を取得
   */
  static async getAllExpenses(req: Request, res: Response) {
    try {
      const result = await ExpenseService.getAllExpenses();
      
      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('Error fetching expenses:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * IDで費用を取得
   */
  static async getExpenseById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      if (!id) {
        return res.status(400).json({
          success: false,
          error: 'Expense ID is required'
        });
      }

      const result = await ExpenseService.getExpenseById(id);
      
      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(404).json(result);
      }
    } catch (error) {
      console.error('Error fetching expense:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * 費用を削除
   */
  static async deleteExpense(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      if (!id) {
        return res.status(400).json({
          success: false,
          error: 'Expense ID is required'
        });
      }

      const result = await ExpenseService.deleteExpense(id);
      
      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(404).json(result);
      }
    } catch (error) {
      console.error('Error deleting expense:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * 費用の統計情報を取得
   */
  static async getExpenseStats(req: Request, res: Response) {
    try {
      const result = await ExpenseService.getExpenseStats();
      
      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('Error fetching expense stats:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
} 
