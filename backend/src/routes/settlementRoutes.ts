import express from 'express';
import { settlementController } from '../controllers/settlementController';

const router = express.Router();

// 精算一覧を取得
router.get('/', settlementController.getAllSettlements);

// 精算を計算
router.post('/calculate/:expenseId', settlementController.calculateSettlement);

// 精算を承認
router.put('/:settlementId/approve', settlementController.approveSettlement);

// 精算を完了
router.put('/:settlementId/complete', settlementController.completeSettlement);

export default router; 
