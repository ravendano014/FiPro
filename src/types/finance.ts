export interface ExtraPayment {
  id: string;
  date: string;
  amount: number;
}

export interface RecurringExtraPayment {
  id: string;
  startDate: string;
  endDate: string;
  amount: number;
}

export interface Loan {
  id: string;
  name: string;
  type: 'mortgage' | 'auto';
  amount: number;
  annualRate: number;
  years: number;
  insuranceMonthly: number;
  vatFixed: number; // Changed from vatRate to vatFixed
  startDate: string;
  extraPayments: ExtraPayment[];
  recurringExtraPayments: RecurringExtraPayment[];
}

export interface AmortizationRow {
  month: number;
  payment: number;
  interest: number;
  principal: number;
  extraPayment: number;
  insurance: number;
  vat: number;
  totalPayment: number;
  remainingBalance: number;
  date: string;
}

export interface BudgetEntry {
  id: string;
  description: string;
  amount: number;
  category: string;
  type: 'income' | 'expense';
  date: string;
  isExternal?: boolean;
}

export interface FinanceState {
  loans: Loan[];
  budget: BudgetEntry[];
  goals: Goal[];
  assets: Asset[];
}

export interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string;
  category: 'savings' | 'investment';
}

export interface Asset {
  id: string;
  name: string;
  value: number;
  type: 'property' | 'investment' | 'other';
  monthlyIncome: number; // Passive income
  description: string;
}
