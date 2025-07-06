export interface Expense {
  id: string;
  category: string;
  description: string;
  amount: number;
  enteredBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateExpenseRequest {
  category: string;
  description: string;
  amount: number;
  enteredBy: string;
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
} 
