import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(amount);
}

export function calculateMonthlyPayment(principal: number, annualRate: number, years: number) {
  const monthlyRate = annualRate / 100 / 12;
  const numberOfPayments = years * 12;
  
  if (monthlyRate === 0) return principal / numberOfPayments;
  
  const payment = (principal * monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments)) / 
                  (Math.pow(1 + monthlyRate, numberOfPayments) - 1);
  return payment;
}
