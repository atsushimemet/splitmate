import { Router } from 'express';
import { AllocationRatioController } from '../controllers/allocationRatioController-postgres';

const router = Router();

// 配分比率関連のルート
router.get('/', AllocationRatioController.getAllocationRatio);
router.put('/', AllocationRatioController.updateAllocationRatio);

export default router; 
