import { Request, Response } from 'express';
import { settlementService } from '../services/settlementService';

export const settlementController = {
  // 精算を計算
  calculateSettlement: async (req: Request, res: Response) => {
    try {
      const { expenseId } = req.params;
      
      if (!expenseId) {
        return res.status(400).json({
          success: false,
          error: '費用IDが必要です'
        });
      }

      const result = await settlementService.calculateSettlement(expenseId);
      
      if (result.success) {
        res.json({
          success: true,
          data: result.data
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error
        });
      }
    } catch (error) {
      console.error('Error calculating settlement:', error);
      res.status(500).json({
        success: false,
        error: '精算計算に失敗しました'
      });
    }
  },

  // 精算を承認
  approveSettlement: async (req: Request, res: Response) => {
    try {
      const { settlementId } = req.params;
      
      if (!settlementId) {
        return res.status(400).json({
          success: false,
          error: '精算IDが必要です'
        });
      }

      const result = await settlementService.approveSettlement(settlementId);
      
      if (result.success) {
        res.json({
          success: true,
          data: result.data
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error
        });
      }
    } catch (error) {
      console.error('Error approving settlement:', error);
      res.status(500).json({
        success: false,
        error: '精算の承認に失敗しました'
      });
    }
  },

  // 精算を完了
  completeSettlement: async (req: Request, res: Response) => {
    try {
      const { settlementId } = req.params;
      
      if (!settlementId) {
        return res.status(400).json({
          success: false,
          error: '精算IDが必要です'
        });
      }

      const result = await settlementService.completeSettlement(settlementId);
      
      if (result.success) {
        res.json({
          success: true,
          data: result.data
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error
        });
      }
    } catch (error) {
      console.error('Error completing settlement:', error);
      res.status(500).json({
        success: false,
        error: '精算の完了に失敗しました'
      });
    }
  },

  // 精算一覧を取得
  getAllSettlements: async (req: Request, res: Response) => {
    try {
      const result = await settlementService.getAllSettlements();
      
      if (result.success) {
        res.json({
          success: true,
          data: result.data
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error
        });
      }
    } catch (error) {
      console.error('Error getting settlements:', error);
      res.status(500).json({
        success: false,
        error: '精算一覧の取得に失敗しました'
      });
    }
  }
}; 
