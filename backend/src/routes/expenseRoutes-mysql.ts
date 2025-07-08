import { Router } from 'express';
import { ExpenseController } from '../controllers/expenseController-mysql';

const router = Router();

// 費用関連のルート
router.post('/', ExpenseController.createExpense);
router.get('/', ExpenseController.getAllExpenses);
router.get('/stats', ExpenseController.getExpenseStats);
router.delete('/bulk', ExpenseController.bulkDeleteExpenses); // 一括削除（個別削除より先に定義）
router.get('/:id', ExpenseController.getExpenseById);
router.delete('/:id', ExpenseController.deleteExpense);

export default router; 
