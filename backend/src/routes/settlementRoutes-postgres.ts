import { Router } from 'express';
import { SettlementController } from '../controllers/settlementController-postgres';

const router = Router();

// 精算関連のルート
router.post('/calculate/:expenseId', SettlementController.calculateSettlement);
router.put('/:settlementId/approve', SettlementController.approveSettlement);
router.put('/:settlementId/complete', SettlementController.completeSettlement);
router.get('/', SettlementController.getAllSettlements);
router.delete('/:settlementId', SettlementController.deleteSettlement);

export default router; 
