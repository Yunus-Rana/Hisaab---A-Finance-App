import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FinanceCalculationsService } from '../../core/finance-calculations.service';
import { TRACKER_REPOSITORY } from '../../data/repositories/tracker-repository.token';

@Component({
  imports: [CurrencyPipe, DatePipe],
  selector: 'app-savings-planner',
  templateUrl: './savings-planner.component.html',
  styleUrl: './savings-planner.component.css',
})
export class SavingsPlannerComponent implements OnInit {
  private readonly repository = inject(TRACKER_REPOSITORY);
  private readonly calculations = inject(FinanceCalculationsService);
  readonly target = signal(100000);
  readonly current = signal(0);
  readonly monthlyContribution = signal(0);
  readonly currentMonthNetSavings = signal<number | null>(null);
  readonly errorMessage = signal('');
  readonly plan = computed(() =>
    this.calculations.calculateSavingsPlan(
      this.target(),
      this.current(),
      this.monthlyContribution(),
    ),
  );

  async ngOnInit(): Promise<void> {
    try {
      const [incomes, expenses] = await Promise.all([
        this.repository.listIncomes(),
        this.repository.listExpenses(),
      ]);
      const now = new Date();
      const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      this.currentMonthNetSavings.set(
        this.calculations.summarizeMonth(incomes, expenses, month).netSavings,
      );
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error ? error.message : 'Could not estimate savings from your records.',
      );
    }
  }

  useCurrentMonthSavings(): void {
    this.monthlyContribution.set(Math.max(0, this.currentMonthNetSavings() ?? 0));
  }

  updateAmount(field: 'target' | 'current' | 'monthlyContribution', event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) {
      return;
    }
    const amount = Number(target.value);
    if (Number.isFinite(amount) && amount >= 0) {
      this[field].set(amount);
    }
  }

  get completionDate(): Date | null {
    const months = this.plan()?.monthsToGoal;
    if (months === undefined) {
      return null;
    }
    const date = new Date();
    date.setDate(1);
    date.setMonth(date.getMonth() + months);
    return date;
  }
}
