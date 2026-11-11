import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ExpenseExportService } from '../../core/expense-export.service';
import { Category } from '../../data/models/category.model';
import { Expense } from '../../data/models/expense.model';
import { TRACKER_REPOSITORY } from '../../data/repositories/tracker-repository.token';

@Component({
  imports: [CurrencyPipe, DatePipe, ReactiveFormsModule],
  selector: 'app-expense-list',
  templateUrl: './expense-list.component.html',
})
export class ExpenseListComponent implements OnInit {
  private readonly repository = inject(TRACKER_REPOSITORY);
  private readonly expenseExport = inject(ExpenseExportService);

  readonly categories = signal<Category[]>([]);
  readonly expenses = signal<Expense[]>([]);
  readonly editingId = signal<string | null>(null);
  readonly isLoading = signal(true);
  readonly isSaving = signal(false);
  readonly errorMessage = signal('');

  readonly form = new FormGroup({
    categoryId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    amount: new FormControl('', {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.pattern(/^\d+(\.\d{1,2})?$/),
        Validators.min(0.01),
      ],
    }),
    spentOn: new FormControl(this.today(), {
      nonNullable: true,
      validators: [Validators.required],
    }),
    note: new FormControl('', { nonNullable: true }),
  });

  async ngOnInit(): Promise<void> {
    await this.loadData();
  }

  async saveExpense(): Promise<void> {
    this.errorMessage.set('');
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const input = {
      categoryId: value.categoryId,
      amount: Number(value.amount),
      spentOn: value.spentOn,
      note: value.note.trim() || null,
    };

    this.isSaving.set(true);
    try {
      const editingId = this.editingId();
      if (editingId) {
        await this.repository.updateExpense(editingId, input);
      } else {
        await this.repository.createExpense(input);
      }
      this.cancelEdit();
      await this.loadData();
    } catch (error) {
      this.errorMessage.set(this.errorMessageFor(error));
    } finally {
      this.isSaving.set(false);
    }
  }

  editExpense(expense: Expense): void {
    this.editingId.set(expense.id);
    this.form.setValue({
      categoryId: expense.categoryId,
      amount: expense.amount.toFixed(2),
      spentOn: expense.spentOn,
      note: expense.note ?? '',
    });
    this.errorMessage.set('');
  }

  async deleteExpense(expense: Expense): Promise<void> {
    if (!globalThis.confirm(`Delete this ${this.formatAmount(expense.amount)} expense?`)) {
      return;
    }

    this.errorMessage.set('');
    try {
      await this.repository.deleteExpense(expense.id);
      if (this.editingId() === expense.id) {
        this.cancelEdit();
      }
      await this.loadData();
    } catch (error) {
      this.errorMessage.set(this.errorMessageFor(error));
    }
  }

  cancelEdit(): void {
    this.editingId.set(null);
    this.form.reset({
      categoryId: this.defaultCategoryId(),
      amount: '',
      spentOn: this.today(),
      note: '',
    });
  }

  categoryName(id: string): string {
    return this.categories().find((category) => category.id === id)?.name ?? 'Unknown category';
  }

  formatAmount(amount: number): string {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
    }).format(amount);
  }

  exportCsv(): void {
    this.expenseExport.downloadCsv(this.expenses(), this.categories());
  }

  printExpenses(): void {
    this.expenseExport.printExpenses();
  }

  private async loadData(): Promise<void> {
    this.isLoading.set(true);
    this.errorMessage.set('');
    try {
      const [categories, expenses] = await Promise.all([
        this.repository.listCategories(),
        this.repository.listExpenses(),
      ]);
      this.categories.set(categories);
      this.expenses.set(expenses);
      if (!this.editingId() && !this.form.controls.categoryId.value && categories.length) {
        this.form.controls.categoryId.setValue(this.defaultCategoryId());
      }
    } catch (error) {
      this.errorMessage.set(this.errorMessageFor(error));
    } finally {
      this.isLoading.set(false);
    }
  }

  private errorMessageFor(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return 'Something went wrong while saving your expense.';
  }

  private defaultCategoryId(): string {
    const categories = this.categories();
    return categories.find((category) => category.name === 'Food')?.id ?? categories[0]?.id ?? '';
  }

  private today(): string {
    const now = new Date();
    const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
    return localDate.toISOString().slice(0, 10);
  }
}
