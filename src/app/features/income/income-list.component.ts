import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Income } from '../../data/models/income.model';
import { TRACKER_REPOSITORY } from '../../data/repositories/tracker-repository.token';

@Component({
  imports: [CurrencyPipe, DatePipe, ReactiveFormsModule],
  selector: 'app-income-list',
  templateUrl: './income-list.component.html',
})
export class IncomeListComponent implements OnInit {
  private readonly repository = inject(TRACKER_REPOSITORY);

  readonly incomes = signal<Income[]>([]);
  readonly editingId = signal<string | null>(null);
  readonly isLoading = signal(true);
  readonly isSaving = signal(false);
  readonly errorMessage = signal('');
  readonly form = new FormGroup({
    source: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(100)],
    }),
    amount: new FormControl('', {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.pattern(/^\d+(\.\d{1,2})?$/),
        Validators.min(0.01),
      ],
    }),
    receivedOn: new FormControl(this.today(), {
      nonNullable: true,
      validators: [Validators.required],
    }),
    note: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(500)] }),
  });

  async ngOnInit(): Promise<void> {
    await this.loadIncomes();
  }

  async saveIncome(): Promise<void> {
    this.errorMessage.set('');
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const input = {
      source: value.source.trim(),
      amount: Number(value.amount),
      receivedOn: value.receivedOn,
      note: value.note.trim() || null,
    };
    this.isSaving.set(true);
    try {
      const id = this.editingId();
      if (id) {
        await this.repository.updateIncome(id, input);
      } else {
        await this.repository.createIncome(input);
      }
      this.cancelEdit();
      await this.loadIncomes();
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error ? error.message : 'Could not save this income entry.',
      );
    } finally {
      this.isSaving.set(false);
    }
  }

  editIncome(income: Income): void {
    this.editingId.set(income.id);
    this.form.setValue({
      source: income.source,
      amount: income.amount.toFixed(2),
      receivedOn: income.receivedOn,
      note: income.note ?? '',
    });
    this.errorMessage.set('');
  }

  async deleteIncome(income: Income): Promise<void> {
    if (!globalThis.confirm(`Delete the ${income.source} income entry?`)) {
      return;
    }
    try {
      await this.repository.deleteIncome(income.id);
      if (this.editingId() === income.id) {
        this.cancelEdit();
      }
      await this.loadIncomes();
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error ? error.message : 'Could not delete this income entry.',
      );
    }
  }

  cancelEdit(): void {
    this.editingId.set(null);
    this.form.reset({ source: '', amount: '', receivedOn: this.today(), note: '' });
  }

  private async loadIncomes(): Promise<void> {
    this.isLoading.set(true);
    try {
      this.incomes.set(await this.repository.listIncomes());
      this.errorMessage.set('');
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error ? error.message : 'Could not load income records.',
      );
    } finally {
      this.isLoading.set(false);
    }
  }

  private today(): string {
    const now = new Date();
    return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
  }
}
