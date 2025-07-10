export interface Expense {
  id: string;
  description: string;
  amount: number;
  payerId: string;
  expenseYear: number;
  expenseMonth: number;
  // Custom allocation ratio fields
  customHusbandRatio?: number | null;
  customWifeRatio?: number | null;
  usesCustomRatio: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateExpenseRequest {
  description: string;
  amount: number;
  payerId: string;
  expenseYear?: number; // Optional - defaults to current year
  expenseMonth?: number; // Optional - defaults to current month
  // Custom allocation ratio fields
  customHusbandRatio?: number;
  customWifeRatio?: number;
  usesCustomRatio?: boolean;
}

export interface UpdateExpenseAllocationRatioRequest {
  customHusbandRatio: number;
  customWifeRatio: number;
  usesCustomRatio: boolean;
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
  minAmount: number;
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
  // Custom allocation ratio fields
  customHusbandRatio?: number | null;
  customWifeRatio?: number | null;
  usesCustomRatio: boolean;
}

// Monthly expense specific interfaces
export interface MonthlyExpenseSummary {
  year: number;
  month: number;
  totalAmount: number;
  totalExpenses: number;
  husbandAmount: number;
  wifeAmount: number;
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
