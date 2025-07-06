import express from 'express';
import { allocationRatioController } from '../controllers/allocationRatioController';

const router = express.Router();

// 配分比率を取得
router.get('/', allocationRatioController.getAllocationRatio);

// 配分比率を更新
router.put('/', allocationRatioController.updateAllocationRatio);

export default router; 
