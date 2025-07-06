import { Router } from 'express';
import { ExpenseController } from '../controllers/expenseController';

const router = Router();

// 費用関連のルート
router.post('/', ExpenseController.createExpense);
router.get('/', ExpenseController.getAllExpenses);
router.get('/stats', ExpenseController.getExpenseStats);
router.get('/:id', ExpenseController.getExpenseById);
router.delete('/:id', ExpenseController.deleteExpense);

export default router; 
