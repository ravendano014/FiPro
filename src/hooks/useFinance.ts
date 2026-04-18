import { useState, useEffect, useCallback } from 'react';
import { Loan, BudgetEntry, FinanceState, AmortizationRow, Goal, Asset } from '../types/finance';
import { addMonths, format } from 'date-fns';

const STORAGE_KEY = 'finance_assistant_data';

export function useFinance() {
  const [state, setState] = useState<FinanceState>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          loans: parsed.loans || [],
          budget: parsed.budget || [],
          goals: parsed.goals || [],
          assets: parsed.assets || [],
        };
      } catch (e) {
        console.error('Error parsing saved data', e);
      }
    }
    return { loans: [], budget: [], goals: [], assets: [] };
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const addLoan = (loan: Omit<Loan, 'id' | 'extraPayments' | 'recurringExtraPayments'>) => {
    const newLoan: Loan = {
      ...loan,
      id: crypto.randomUUID(),
      extraPayments: [],
      recurringExtraPayments: [],
    };
    setState(prev => ({ ...prev, loans: [...prev.loans, newLoan] }));
  };

  const updateLoan = (id: string, updates: Partial<Loan>) => {
    setState(prev => ({
      ...prev,
      loans: prev.loans.map(l => l.id === id ? { ...l, ...updates } : l)
    }));
  };

  const deleteLoan = (id: string) => {
    setState(prev => ({ ...prev, loans: prev.loans.filter(l => l.id !== id) }));
  };

  const addExtraPayment = (loanId: string, date: string, amount: number) => {
    setState(prev => ({
      ...prev,
      loans: prev.loans.map(l => {
        if (l.id === loanId) {
          return {
            ...l,
            extraPayments: [...l.extraPayments, { id: crypto.randomUUID(), date, amount }],
          };
        }
        return l;
      }),
    }));
  };

  const deleteExtraPayment = (loanId: string, paymentId: string) => {
    setState(prev => ({
      ...prev,
      loans: prev.loans.map(l => {
        if (l.id === loanId) {
          return {
            ...l,
            extraPayments: l.extraPayments.filter(ep => ep.id !== paymentId),
          };
        }
        return l;
      }),
    }));
  };

  const addRecurringExtraPayment = (loanId: string, startDate: string, endDate: string, amount: number) => {
    setState(prev => ({
      ...prev,
      loans: prev.loans.map(l => {
        if (l.id === loanId) {
          return {
            ...l,
            recurringExtraPayments: [...(l.recurringExtraPayments || []), { id: crypto.randomUUID(), startDate, endDate, amount }],
          };
        }
        return l;
      }),
    }));
  };

  const deleteRecurringExtraPayment = (loanId: string, paymentId: string) => {
    setState(prev => ({
      ...prev,
      loans: prev.loans.map(l => {
        if (l.id === loanId) {
          return {
            ...l,
            recurringExtraPayments: (l.recurringExtraPayments || []).filter(rep => rep.id !== paymentId),
          };
        }
        return l;
      }),
    }));
  };

  const addBudgetEntry = (entry: Omit<BudgetEntry, 'id'>) => {
    const newEntry: BudgetEntry = {
      ...entry,
      id: crypto.randomUUID(),
    };
    setState(prev => ({ ...prev, budget: [...prev.budget, newEntry] }));
  };

  const updateBudgetEntry = (id: string, updates: Partial<BudgetEntry>) => {
    setState(prev => ({
      ...prev,
      budget: prev.budget.map(b => b.id === id ? { ...b, ...updates } : b)
    }));
  };

  const deleteBudgetEntry = (id: string) => {
    setState(prev => ({ ...prev, budget: prev.budget.filter(b => b.id !== id) }));
  };

  const addGoal = (goal: Omit<Goal, 'id'>) => {
    const newGoal: Goal = { ...goal, id: crypto.randomUUID() };
    setState(prev => ({ ...prev, goals: [...prev.goals, newGoal] }));
  };

  const updateGoal = (id: string, updates: Partial<Goal>) => {
    setState(prev => ({
      ...prev,
      goals: prev.goals.map(g => g.id === id ? { ...g, ...updates } : g)
    }));
  };

  const deleteGoal = (id: string) => {
    setState(prev => ({ ...prev, goals: prev.goals.filter(g => g.id !== id) }));
  };

  const addAsset = (asset: Omit<Asset, 'id'>) => {
    const newAsset: Asset = { ...asset, id: crypto.randomUUID() };
    setState(prev => ({ ...prev, assets: [...prev.assets, newAsset] }));
  };

  const updateAsset = (id: string, updates: Partial<Asset>) => {
    setState(prev => ({
      ...prev,
      assets: prev.assets.map(a => a.id === id ? { ...a, ...updates } : a)
    }));
  };

  const deleteAsset = (id: string) => {
    setState(prev => ({ ...prev, assets: prev.assets.filter(a => a.id !== id) }));
  };

  const importData = (data: FinanceState) => {
    setState(data);
  };

  const calculateAmortization = useCallback((loan: Loan): AmortizationRow[] => {
    const schedule: AmortizationRow[] = [];
    let balance = loan.amount;
    const monthlyRate = loan.annualRate / 100 / 12;
    const totalMonths = loan.years * 12;
    
    // Base monthly payment (Principal + Interest)
    const basePayment = (loan.amount * monthlyRate * Math.pow(1 + monthlyRate, totalMonths)) / 
                        (Math.pow(1 + monthlyRate, totalMonths) - 1);

    const startDate = new Date(loan.startDate);

    for (let m = 1; m <= totalMonths && balance > 0.01; m++) {
      const interest = balance * monthlyRate;
      const vat = loan.vatFixed; // Fixed VAT
      const insurance = loan.insuranceMonthly;
      
      let principal = basePayment - interest;
      
      // Check for extra payments this month
      const extraOneTime = loan.extraPayments
        .filter(ep => {
          const epDate = new Date(ep.date);
          const mDiff = (epDate.getFullYear() - startDate.getFullYear()) * 12 + (epDate.getMonth() - startDate.getMonth()) + 1;
          return mDiff === m;
        })
        .reduce((sum, ep) => sum + ep.amount, 0);

      const currentDate = addMonths(startDate, m);
      const extraRecurring = (loan.recurringExtraPayments || [])
        .filter(rep => {
          const repStart = new Date(rep.startDate);
          const repEnd = new Date(rep.endDate);
          return currentDate >= repStart && currentDate <= repEnd;
        })
        .reduce((sum, rep) => sum + rep.amount, 0);

      const extra = extraOneTime + extraRecurring;

      if (principal > balance) {
        principal = balance;
      }

      const totalPayment = principal + interest + vat + insurance + extra;
      balance -= (principal + extra);
      
      if (balance < 0) balance = 0;

      schedule.push({
        month: m,
        payment: basePayment,
        interest,
        principal,
        extraPayment: extra,
        insurance,
        vat,
        totalPayment,
        remainingBalance: balance,
        date: format(addMonths(startDate, m), 'MMM yyyy'),
      });
    }

    return schedule;
  }, []);

  return {
    state,
    addLoan,
    updateLoan,
    deleteLoan,
    addExtraPayment,
    addBudgetEntry,
    updateBudgetEntry,
    deleteBudgetEntry,
    addGoal,
    updateGoal,
    deleteGoal,
    addAsset,
    updateAsset,
    deleteAsset,
    deleteExtraPayment,
    addRecurringExtraPayment,
    deleteRecurringExtraPayment,
    importData,
    calculateAmortization,
  };
}
