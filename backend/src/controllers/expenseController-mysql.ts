import { Request, Response } from 'express';
import { z } from 'zod';
import { ExpenseService } from '../services/expenseService-mysql';

// バリデーションスキーマ
const createExpenseSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  amount: z.number().positive('Amount must be positive'),
  payerId: z.string().min(1, 'Payer ID is required'),
  expenseYear: z.number().int().min(2020).max(2099).optional(),
  expenseMonth: z.number().int().min(1).max(12).optional()
});

const bulkDeleteExpenseSchema = z.object({
  ids: z.array(z.string().min(1, 'Expense ID is required')).min(1, 'At least one expense ID is required')
});

const monthlyExpenseSchema = z.object({
  year: z.number().int().min(2020).max(2099),
  month: z.number().int().min(1).max(12)
});

const updateExpenseAllocationRatioSchema = z.object({
  customHusbandRatio: z.number().min(0).max(1, 'Husband ratio must be between 0 and 1'),
  customWifeRatio: z.number().min(0).max(1, 'Wife ratio must be between 0 and 1'),
  usesCustomRatio: z.boolean()
}).refine((data) => Math.abs(data.customHusbandRatio + data.customWifeRatio - 1) < 0.001, {
  message: 'Husband and wife ratios must sum to 1'
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
      return;
    } catch (error) {
      console.error('Error creating expense:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
      return;
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
      return;
    } catch (error) {
      console.error('Error fetching expenses:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
      return;
    }
  }

  /**
   * 指定した年月の費用を取得
   */
  static async getExpensesByMonth(req: Request, res: Response) {
    try {
      const year = parseInt(req.params.year);
      const month = parseInt(req.params.month);
      
      const validationResult = monthlyExpenseSchema.safeParse({ year, month });
      
      if (!validationResult.success) {
        return res.status(400).json({
          success: false,
          error: 'Invalid year or month',
          details: validationResult.error.errors
        });
      }

      const result = await ExpenseService.getExpensesByMonth(year, month);
      
      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }
      return;
    } catch (error) {
      console.error('Error fetching monthly expenses:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
      return;
    }
  }

  /**
   * 指定した年月の費用サマリーを取得
   */
  static async getMonthlyExpenseSummary(req: Request, res: Response) {
    try {
      const year = parseInt(req.params.year);
      const month = parseInt(req.params.month);
      
      const validationResult = monthlyExpenseSchema.safeParse({ year, month });
      
      if (!validationResult.success) {
        return res.status(400).json({
          success: false,
          error: 'Invalid year or month',
          details: validationResult.error.errors
        });
      }

      const result = await ExpenseService.getMonthlyExpenseSummary(year, month);
      
      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }
      return;
    } catch (error) {
      console.error('Error fetching monthly expense summary:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
      return;
    }
  }

  /**
   * 月次費用統計情報を取得
   */
  static async getMonthlyExpenseStats(req: Request, res: Response) {
    try {
      // クエリパラメータから年月を取得（オプション）
      const year = req.query.year ? parseInt(req.query.year as string) : undefined;
      const month = req.query.month ? parseInt(req.query.month as string) : undefined;
      
      // 年月が指定されている場合はバリデーション
      if (year !== undefined && month !== undefined) {
        const validationResult = monthlyExpenseSchema.safeParse({ year, month });
        
        if (!validationResult.success) {
          return res.status(400).json({
            success: false,
            error: 'Invalid year or month',
            details: validationResult.error.errors
          });
        }
      }

      const result = await ExpenseService.getMonthlyExpenseStats(year, month);
      
      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }
      return;
    } catch (error) {
      console.error('Error fetching monthly expense stats:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
      return;
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
      return;
    } catch (error) {
      console.error('Error fetching expense:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
      return;
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
      return;
    } catch (error) {
      console.error('Error deleting expense:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
      return;
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
      return;
    } catch (error) {
      console.error('Error fetching expense stats:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
      return;
    }
  }

  /**
   * 複数の費用を一括削除
   */
  static async bulkDeleteExpenses(req: Request, res: Response) {
    try {
      const validationResult = bulkDeleteExpenseSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: validationResult.error.errors
        });
      }

      const result = await ExpenseService.bulkDeleteExpenses(validationResult.data.ids);
      
      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }
      return;
    } catch (error) {
      console.error('Error bulk deleting expenses:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
      return;
    }
  }

  /**
   * 費用の個別配分比率を更新
   */
  static async updateExpenseAllocationRatio(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      if (!id) {
        return res.status(400).json({
          success: false,
          error: 'Expense ID is required'
        });
      }

      const validationResult = updateExpenseAllocationRatioSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: validationResult.error.errors
        });
      }

      const result = await ExpenseService.updateExpenseAllocationRatio(id, validationResult.data);
      
      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }
      return;
    } catch (error) {
      console.error('Error updating expense allocation ratio:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
      return;
    }
  }
} 
