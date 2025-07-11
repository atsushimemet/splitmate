import express from 'express';
import { ExpenseController } from '../controllers/expenseController-postgres';

const router = express.Router();

// 費用関連のルート
router.post('/', ExpenseController.createExpense);
router.get('/', ExpenseController.getAllExpenses);
router.get('/stats', ExpenseController.getExpenseStats);
router.get('/users', ExpenseController.getAvailableUsers);
router.get('/monthly/:year/:month', ExpenseController.getExpensesByMonth);
router.get('/monthly-stats', ExpenseController.getMonthlyExpenseStats);
router.get('/:id', ExpenseController.getExpenseById);
router.delete('/:id', ExpenseController.deleteExpense);

// 個別配分比率更新エンドポイント
router.put('/:id/allocation-ratio', ExpenseController.updateExpenseAllocationRatio);

export default router; 
