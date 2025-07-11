import express from 'express';
import { SettlementController } from '../controllers/settlementController-postgres';

const router = express.Router();

// 精算関連のルート
router.post('/calculate/:expenseId', SettlementController.calculateSettlement);
router.get('/', SettlementController.getAllSettlements);
router.put('/:settlementId/approve', SettlementController.approveSettlement);
router.put('/:settlementId/complete', SettlementController.completeSettlement);
router.put('/:id/status', SettlementController.updateSettlementStatus);

export default router; 
