import { Request, Response } from 'express';
import { z } from 'zod';
import { allocationRatioService } from '../services/allocationRatioService-postgres';

// バリデーションスキーマ
const updateAllocationRatioSchema = z.object({
  husbandRatio: z.number().min(0).max(1, 'Husband ratio must be between 0 and 1'),
  wifeRatio: z.number().min(0).max(1, 'Wife ratio must be between 0 and 1')
}).refine((data) => Math.abs(data.husbandRatio + data.wifeRatio - 1) < 0.001, {
  message: 'Husband and wife ratios must sum to 1'
});

export class AllocationRatioController {
  /**
   * 配分比率を取得
   */
  static async getAllocationRatio(req: Request, res: Response) {
    try {
      const result = await allocationRatioService.getAllocationRatio();
      
      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }
      return;
    } catch (error) {
      console.error('Error fetching allocation ratio:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
      return;
    }
  }

  /**
   * 配分比率を更新
   */
  static async updateAllocationRatio(req: Request, res: Response) {
    try {
      const validationResult = updateAllocationRatioSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: validationResult.error.errors
        });
      }

      const result = await allocationRatioService.updateAllocationRatio(validationResult.data);
      
      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }
      return;
    } catch (error) {
      console.error('Error updating allocation ratio:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
      return;
    }
  }
} 
