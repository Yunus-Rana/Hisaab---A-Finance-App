import { Category } from '../models/category.model';
import { Expense } from '../models/expense.model';
import { Income } from '../models/income.model';

export interface DateRange {
  from?: string;
  to?: string;
}

export interface ExpenseFilter extends DateRange {
  categoryId?: string;
}

export interface NewCategory {
  name: string;
}

export interface NewIncome {
  source: string;
  amount: number;
  receivedOn: string;
  note?: string | null;
}

export interface NewExpense {
  categoryId: string;
  amount: number;
  spentOn: string;
  note?: string | null;
}

export type UpdateIncome = Partial<NewIncome>;
export type UpdateExpense = Partial<NewExpense>;

export interface GuestImportData {
  categories: Category[];
  incomes: Income[];
  expenses: Expense[];
}

export interface GuestImportResult {
  imported: {
    categories: number;
    incomes: number;
    expenses: number;
  };
  skipped: number;
}

export interface TrackerRepository {
  listCategories(): Promise<Category[]>;
  getCategory(id: string): Promise<Category | null>;
  createCategory(input: NewCategory): Promise<Category>;
  renameCategory(id: string, name: string): Promise<Category>;
  deleteCategory(id: string): Promise<void>;

  listIncomes(filter?: DateRange): Promise<Income[]>;
  getIncome(id: string): Promise<Income | null>;
  createIncome(input: NewIncome): Promise<Income>;
  updateIncome(id: string, changes: UpdateIncome): Promise<Income>;
  deleteIncome(id: string): Promise<void>;

  listExpenses(filter?: ExpenseFilter): Promise<Expense[]>;
  getExpense(id: string): Promise<Expense | null>;
  createExpense(input: NewExpense): Promise<Expense>;
  updateExpense(id: string, changes: UpdateExpense): Promise<Expense>;
  deleteExpense(id: string): Promise<void>;
}

export interface GuestDataImportSource {
  getImportSnapshot(): Promise<GuestImportData>;
}

export interface GuestDataImportTarget {
  importGuestData(data: GuestImportData): Promise<GuestImportResult>;
}
