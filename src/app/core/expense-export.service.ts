import { Injectable } from '@angular/core';
import { Category } from '../data/models/category.model';
import { Expense } from '../data/models/expense.model';

@Injectable({ providedIn: 'root' })
export class ExpenseExportService {
  downloadCsv(expenses: Expense[], categories: Category[]): void {
    const categoryNames = new Map(categories.map((category) => [category.id, category.name]));
    const rows = [
      ['Date', 'Category', 'Amount (PKR)', 'Note'],
      ...expenses.map((expense) => [
        expense.spentOn,
        categoryNames.get(expense.categoryId) ?? 'Unknown category',
        expense.amount.toFixed(2),
        expense.note ?? '',
      ]),
    ];
    const csv = rows.map((row) => row.map((field) => this.escapeCsv(field)).join(',')).join('\r\n');
    const blob = new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `hisaab-expenses-${this.localDate()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  printExpenses(): void {
    window.print();
  }

  private escapeCsv(value: string): string {
    const safeValue = /^[\t\r\n ]*[=+\-@]/.test(value) ? `'${value}` : value;
    return /[",\r\n]/.test(safeValue) ? `"${safeValue.replaceAll('"', '""')}"` : safeValue;
  }

  private localDate(): string {
    const now = new Date();
    return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
  }
}
