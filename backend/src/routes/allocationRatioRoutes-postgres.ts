import express from 'express';
import { AllocationRatioController } from '../controllers/allocationRatioController-postgres';

const router = express.Router();

// 配分比率関連のルート
router.get('/', AllocationRatioController.getDefaultAllocationRatio);
router.put('/', AllocationRatioController.updateDefaultAllocationRatio);

export default router; 
