import { Request, Response } from 'express';
import { allocationRatioService } from '../services/allocationRatioService';
import { UpdateAllocationRatioRequest } from '../types';

export const allocationRatioController = {
  // 配分比率を取得
  getAllocationRatio: async (req: Request, res: Response) => {
    try {
      const result = await allocationRatioService.getAllocationRatio();
      
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
      console.error('Error getting allocation ratio:', error);
      res.status(500).json({
        success: false,
        error: '配分比率の取得に失敗しました'
      });
    }
  },

  // 配分比率を更新
  updateAllocationRatio: async (req: Request, res: Response) => {
    try {
      const data: UpdateAllocationRatioRequest = req.body;
      
      // バリデーション
      if (typeof data.husbandRatio !== 'number' || typeof data.wifeRatio !== 'number') {
        return res.status(400).json({
          success: false,
          error: '配分比率は数値で指定してください'
        });
      }

      if (data.husbandRatio < 0 || data.husbandRatio > 1 || data.wifeRatio < 0 || data.wifeRatio > 1) {
        return res.status(400).json({
          success: false,
          error: '配分比率は0から1の間で指定してください'
        });
      }

      if (Math.abs(data.husbandRatio + data.wifeRatio - 1) > 0.01) {
        return res.status(400).json({
          success: false,
          error: '配分比率の合計は1.0である必要があります'
        });
      }

      const result = await allocationRatioService.updateAllocationRatio(data);
      
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
      console.error('Error updating allocation ratio:', error);
      res.status(500).json({
        success: false,
        error: '配分比率の更新に失敗しました'
      });
    }
  }
}; 
