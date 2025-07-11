import { Router } from 'express';
import { ExpenseController } from '../controllers/expenseController-postgres';

const router = Router();

// 費用関連のルート
router.post('/', ExpenseController.createExpense);
router.get('/', ExpenseController.getAllExpenses);
router.get('/stats', ExpenseController.getExpenseStats);

// 月次費用関連のルート
router.get('/monthly/stats', ExpenseController.getMonthlyExpenseStats); // 月次統計情報
router.get('/monthly/:year/:month', ExpenseController.getExpensesByMonth); // 指定年月の費用一覧
router.get('/monthly/:year/:month/summary', ExpenseController.getMonthlyExpenseSummary); // 指定年月のサマリー

// 一括削除（個別削除より先に定義）
router.delete('/bulk', ExpenseController.bulkDeleteExpenses);

// 個別費用の操作
router.get('/:id', ExpenseController.getExpenseById);
router.delete('/:id', ExpenseController.deleteExpense);
router.put('/:id/allocation-ratio', ExpenseController.updateExpenseAllocationRatio);

export default router; 
