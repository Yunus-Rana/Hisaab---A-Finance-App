import { FinanceCalculationsService } from './finance-calculations.service';
import { Expense } from '../data/models/expense.model';
import { Income } from '../data/models/income.model';

describe('FinanceCalculationsService', () => {
  const service = new FinanceCalculationsService();
  const incomes: Income[] = [
    {
      id: 'i1',
      source: 'Salary',
      amount: 1000,
      receivedOn: '2026-11-01',
      note: null,
      createdAt: '',
      updatedAt: '',
    },
    {
      id: 'i2',
      source: 'Other',
      amount: 100,
      receivedOn: '2026-10-01',
      note: null,
      createdAt: '',
      updatedAt: '',
    },
  ];
  const expenses: Expense[] = [
    {
      id: 'e1',
      categoryId: 'food',
      amount: 250,
      spentOn: '2026-11-02',
      note: null,
      createdAt: '',
      updatedAt: '',
    },
    {
      id: 'e2',
      categoryId: 'food',
      amount: 50,
      spentOn: '2026-11-03',
      note: null,
      createdAt: '',
      updatedAt: '',
    },
    {
      id: 'e3',
      categoryId: 'rent',
      amount: 100,
      spentOn: '2026-10-03',
      note: null,
      createdAt: '',
      updatedAt: '',
    },
  ];

  it('calculates the selected month only and returns a zero rate without income', () => {
    expect(service.summarizeMonth(incomes, expenses, '2026-11')).toEqual({
      income: 1000,
      expenses: 300,
      netSavings: 700,
      savingsRate: 70,
      expenseCount: 2,
      incomeCount: 1,
    });
    expect(service.summarizeMonth([], expenses, '2026-11').savingsRate).toBe(0);
  });

  it('groups spending by category and calculates shares', () => {
    expect(
      service.expenseTotalsByCategory(
        expenses.filter((item) => item.spentOn.startsWith('2026-11')),
      ),
    ).toEqual([{ categoryId: 'food', amount: 300, share: 100 }]);
  });

  it('builds a chronological trend ending in the selected month', () => {
    expect(service.monthlyTrend(incomes, expenses, '2026-11', 3)).toEqual([
      { month: '2026-09', income: 0, expenses: 0, netSavings: 0 },
      { month: '2026-10', income: 100, expenses: 100, netSavings: 0 },
      { month: '2026-11', income: 1000, expenses: 300, netSavings: 700 },
    ]);
  });

  it('calculates a rounded-up number of months to reach a target', () => {
    expect(service.calculateSavingsPlan(1000, 200, 300)).toEqual({
      amountRemaining: 800,
      monthsToGoal: 3,
    });
    expect(service.calculateSavingsPlan(1000, 1200, 0)).toEqual({
      amountRemaining: 0,
      monthsToGoal: 0,
    });
    expect(service.calculateSavingsPlan(1000, 200, 0)).toBeNull();
  });
});
