import { Request, Response } from 'express';
import { SettlementService } from '../services/settlementService-postgres';

export class SettlementController {
  /**
   * 費用の精算を計算
   */
  static async calculateSettlement(req: Request, res: Response) {
    try {
      const { expenseId } = req.params;
      
      if (!expenseId) {
        return res.status(400).json({
          success: false,
          error: 'Expense ID is required'
        });
      }

      const result = await SettlementService.calculateSettlement(expenseId);
      
      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }
      return;
    } catch (error) {
      console.error('Error calculating settlement:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
      return;
    }
  }

  /**
   * 精算を承認
   */
  static async approveSettlement(req: Request, res: Response) {
    try {
      const { settlementId } = req.params;
      
      if (!settlementId) {
        return res.status(400).json({
          success: false,
          error: 'Settlement ID is required'
        });
      }

      const result = await SettlementService.updateSettlementStatus(settlementId, 'approved');
      
      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(404).json(result);
      }
      return;
    } catch (error) {
      console.error('Error approving settlement:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
      return;
    }
  }

  /**
   * 精算を完了
   */
  static async completeSettlement(req: Request, res: Response) {
    try {
      const { settlementId } = req.params;
      
      if (!settlementId) {
        return res.status(400).json({
          success: false,
          error: 'Settlement ID is required'
        });
      }

      const result = await SettlementService.updateSettlementStatus(settlementId, 'completed');
      
      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(404).json(result);
      }
      return;
    } catch (error) {
      console.error('Error completing settlement:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
      return;
    }
  }

  /**
   * 全ての精算を取得
   */
  static async getAllSettlements(req: Request, res: Response) {
    try {
      const result = await SettlementService.getAllSettlements();
      
      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }
      return;
    } catch (error) {
      console.error('Error fetching settlements:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
      return;
    }
  }

  /**
   * 精算のステータスを更新
   */
  static async updateSettlementStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      if (!id) {
        return res.status(400).json({
          success: false,
          error: 'Settlement ID is required'
        });
      }

      if (!status || !['pending', 'approved', 'completed'].includes(status)) {
        return res.status(400).json({
          success: false,
          error: 'Valid status is required (pending, approved, completed)'
        });
      }

      const result = await SettlementService.updateSettlementStatus(id, status);
      
      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(404).json(result);
      }
      return;
    } catch (error) {
      console.error('Error updating settlement status:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
      return;
    }
  }
} 
