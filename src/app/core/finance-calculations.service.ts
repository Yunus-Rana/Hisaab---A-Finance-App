import { Injectable } from '@angular/core';
import { Expense } from '../data/models/expense.model';
import { Income } from '../data/models/income.model';

export interface MonthlySummary {
  income: number;
  expenses: number;
  netSavings: number;
  savingsRate: number;
  expenseCount: number;
  incomeCount: number;
}

export interface ExpenseCategoryTotal {
  categoryId: string;
  amount: number;
  share: number;
}

export interface MonthlyTrendPoint {
  month: string;
  income: number;
  expenses: number;
  netSavings: number;
}

export interface SavingsPlan {
  amountRemaining: number;
  monthsToGoal: number;
}

@Injectable({ providedIn: 'root' })
export class FinanceCalculationsService {
  summarizeMonth(incomes: Income[], expenses: Expense[], month: string): MonthlySummary {
    const monthlyIncomes = incomes.filter((income) => income.receivedOn.startsWith(month));
    const monthlyExpenses = expenses.filter((expense) => expense.spentOn.startsWith(month));
    const income = this.sum(monthlyIncomes.map((item) => item.amount));
    const expenseTotal = this.sum(monthlyExpenses.map((item) => item.amount));
    const netSavings = income - expenseTotal;

    return {
      income,
      expenses: expenseTotal,
      netSavings,
      savingsRate: income > 0 ? (netSavings / income) * 100 : 0,
      expenseCount: monthlyExpenses.length,
      incomeCount: monthlyIncomes.length,
    };
  }

  expenseTotalsByCategory(expenses: Expense[]): ExpenseCategoryTotal[] {
    const totals = new Map<string, number>();
    for (const expense of expenses) {
      totals.set(
        expense.categoryId,
        this.roundToCents((totals.get(expense.categoryId) ?? 0) + expense.amount),
      );
    }

    const totalExpenses = this.sum([...totals.values()]);
    return [...totals.entries()]
      .map(([categoryId, amount]) => ({
        categoryId,
        amount,
        share: totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0,
      }))
      .sort((left, right) => right.amount - left.amount);
  }

  monthlyTrend(
    incomes: Income[],
    expenses: Expense[],
    throughMonth: string,
    monthCount = 6,
  ): MonthlyTrendPoint[] {
    const [year, month] = throughMonth.split('-').map(Number);
    const start = new Date(year, month - monthCount, 1);
    return Array.from({ length: monthCount }, (_, index) => {
      const date = new Date(start.getFullYear(), start.getMonth() + index, 1);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const summary = this.summarizeMonth(incomes, expenses, key);
      return {
        month: key,
        income: summary.income,
        expenses: summary.expenses,
        netSavings: summary.netSavings,
      };
    });
  }

  calculateSavingsPlan(
    target: number,
    current: number,
    monthlyContribution: number,
  ): SavingsPlan | null {
    const amountRemaining = Math.max(0, target - current);
    if (amountRemaining === 0) {
      return { amountRemaining, monthsToGoal: 0 };
    }
    if (monthlyContribution <= 0) {
      return null;
    }
    return {
      amountRemaining,
      monthsToGoal: Math.ceil(amountRemaining / monthlyContribution),
    };
  }

  private sum(values: number[]): number {
    return this.roundToCents(values.reduce((total, value) => total + value, 0));
  }

  private roundToCents(value: number): number {
    return Math.round(value * 100) / 100;
  }
}
