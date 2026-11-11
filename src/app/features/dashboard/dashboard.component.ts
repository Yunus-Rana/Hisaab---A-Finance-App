import { CurrencyPipe, DatePipe, PercentPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  FinanceCalculationsService,
  MonthlySummary,
  MonthlyTrendPoint,
} from '../../core/finance-calculations.service';
import { Category } from '../../data/models/category.model';
import { Expense } from '../../data/models/expense.model';
import { Income } from '../../data/models/income.model';
import { TRACKER_REPOSITORY } from '../../data/repositories/tracker-repository.token';

@Component({
  imports: [CurrencyPipe, DatePipe, PercentPipe, RouterLink],
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
})
export class DashboardComponent implements OnInit {
  private readonly repository = inject(TRACKER_REPOSITORY);
  private readonly calculations = inject(FinanceCalculationsService);

  readonly currentMonth = signal(this.localMonth());
  readonly summary = signal<MonthlySummary | null>(null);
  readonly categories = signal<Category[]>([]);
  readonly categoryTotals = signal<{ categoryId: string; amount: number; share: number }[]>([]);
  readonly trend = signal<MonthlyTrendPoint[]>([]);
  readonly hasTrendData = computed(() =>
    this.trend().some((point) => point.income > 0 || point.expenses > 0),
  );
  readonly recentExpenses = signal<Expense[]>([]);
  readonly errorMessage = signal('');
  readonly isLoading = signal(true);
  readonly maxTrendValue = signal(1000);

  async ngOnInit(): Promise<void> {
    try {
      const [incomes, expenses, categories] = await Promise.all([
        this.repository.listIncomes(),
        this.repository.listExpenses(),
        this.repository.listCategories(),
      ]);
      const month = this.currentMonth();
      this.summary.set(this.calculations.summarizeMonth(incomes, expenses, month));
      this.categories.set(categories);
      this.categoryTotals.set(
        this.calculations
          .expenseTotalsByCategory(expenses.filter((expense) => expense.spentOn.startsWith(month)))
          .slice(0, 5),
      );
      const trend = this.calculations.monthlyTrend(incomes, expenses, month);
      this.trend.set(trend);
      this.maxTrendValue.set(
        this.niceAxisMaximum(Math.max(...trend.flatMap((item) => [item.income, item.expenses]))),
      );
      this.recentExpenses.set(expenses.slice(0, 5));
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error ? error.message : 'Could not load your financial overview.',
      );
    } finally {
      this.isLoading.set(false);
    }
  }

  categoryName(id: string): string {
    return this.categories().find((category) => category.id === id)?.name ?? 'Unknown category';
  }

  trendHeight(value: number): number {
    return Math.max(value > 0 ? 3 : 0, (value / this.maxTrendValue()) * 100);
  }

  chartX(index: number): number {
    return 12 + (index * 576) / Math.max(1, this.trend().length - 1);
  }

  chartY(value: number): number {
    return 192 - (value / this.maxTrendValue()) * 168;
  }

  chartLine(kind: 'income' | 'expenses'): string {
    return this.trend()
      .map((point, index) => {
        const value = kind === 'income' ? point.income : point.expenses;
        return `${index === 0 ? 'M' : 'L'} ${this.chartX(index)} ${this.chartY(value)}`;
      })
      .join(' ');
  }

  chartArea(kind: 'income' | 'expenses'): string {
    const points = this.chartLine(kind);
    return `${points} L ${this.chartX(this.trend().length - 1)} 192 L ${this.chartX(0)} 192 Z`;
  }

  formatAxisValue(value: number): string {
    if (value === 0) {
      return '0';
    }
    return new Intl.NumberFormat('en-PK', {
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value);
  }

  private niceAxisMaximum(value: number): number {
    if (value <= 0) {
      return 1000;
    }
    const magnitude = 10 ** Math.floor(Math.log10(value));
    const normalized = value / magnitude;
    const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
    return step * magnitude;
  }

  formatMonth(month: string): string {
    return new Date(`${month}-01T12:00:00`).toLocaleDateString('en', {
      month: 'short',
    });
  }

  formatCurrentMonth(month: string): string {
    return new Date(`${month}-01T12:00:00`).toLocaleDateString('en', {
      month: 'short',
      year: 'numeric',
    });
  }

  private localMonth(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }
}
