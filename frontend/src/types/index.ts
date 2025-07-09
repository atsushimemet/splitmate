export interface Expense {
  id: string;
  category: string;
  description: string;
  amount: number;
  payerId: string;
  expenseYear: number;
  expenseMonth: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateExpenseRequest {
  category: string;
  description: string;
  amount: number;
  payerId: string;
  expenseYear?: number; // Optional - defaults to current year
  expenseMonth?: number; // Optional - defaults to current month
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface User {
  id: string;
  name: string;
  role: 'husband' | 'wife';
}

export interface ExpenseStats {
  totalExpenses: number;
  totalAmount: number;
  averageAmount: number;
  minAmount: number;
  maxAmount: number;
}

export interface AllocationRatio {
  id: string;
  husbandRatio: number;
  wifeRatio: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateAllocationRatioRequest {
  husbandRatio: number;
  wifeRatio: number;
}

export interface Settlement {
  id: string;
  expenseId: string;
  husbandAmount: number;
  wifeAmount: number;
  payer: 'husband' | 'wife';
  receiver: 'husband' | 'wife';
  settlementAmount: number;
  status: 'pending' | 'approved' | 'completed';
  createdAt: Date;
  updatedAt: Date;
  expenseDescription?: string;
  expenseAmount?: number;
}

// Monthly expense specific interfaces
export interface MonthlyExpenseSummary {
  year: number;
  month: number;
  totalAmount: number;
  totalExpenses: number;
  husbandAmount: number;
  wifeAmount: number;
  categories: { [category: string]: number };
}

export interface MonthlyExpenseRequest {
  year: number;
  month: number;
}

export interface MonthlyExpenseStats {
  currentMonth: MonthlyExpenseSummary;
  previousMonth: MonthlyExpenseSummary;
  yearToDate: {
    totalAmount: number;
    totalExpenses: number;
    monthlyAverages: number;
  };
} 
