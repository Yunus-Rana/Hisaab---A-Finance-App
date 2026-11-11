import { Category } from '../models/category.model';
import { Expense } from '../models/expense.model';
import { Income } from '../models/income.model';
import { RepositoryError } from '../repositories/repository-error';
import {
  DateRange,
  ExpenseFilter,
  NewCategory,
  NewExpense,
  NewIncome,
  TrackerRepository,
  UpdateExpense,
  UpdateIncome,
} from '../repositories/tracker-repository';

const DATABASE_NAME = 'expense-tracker';
const DATABASE_VERSION = 1;
const CATEGORY_STORE = 'categories';
const INCOME_STORE = 'incomes';
const EXPENSE_STORE = 'expenses';
const DEFAULT_CATEGORIES = ['Food', 'Rent', 'Transport', 'Bills', 'Other'];

interface StoredCategory extends Category {
  nameKey: string;
}

export class LocalRepository implements TrackerRepository {
  private readonly databasePromise = this.openDatabase();

  async listCategories(): Promise<Category[]> {
    const categories = await this.getAll<Category>(CATEGORY_STORE);
    return categories.sort((left, right) => {
      const leftDefaultIndex = DEFAULT_CATEGORIES.indexOf(left.name);
      const rightDefaultIndex = DEFAULT_CATEGORIES.indexOf(right.name);
      if (leftDefaultIndex !== -1 || rightDefaultIndex !== -1) {
        if (leftDefaultIndex === -1) {
          return 1;
        }
        if (rightDefaultIndex === -1) {
          return -1;
        }
        return leftDefaultIndex - rightDefaultIndex;
      }
      return left.name.localeCompare(right.name);
    });
  }

  async getCategory(id: string): Promise<Category | null> {
    return this.getById<Category>(CATEGORY_STORE, id);
  }

  async createCategory(input: NewCategory): Promise<Category> {
    const name = input.name.trim();
    if (!name) {
      throw new RepositoryError('Category name is required.', 'storage');
    }

    const categories = await this.listCategories();
    if (categories.some((category) => category.name.toLowerCase() === name.toLowerCase())) {
      throw new RepositoryError('A category with this name already exists.', 'duplicate');
    }

    const now = new Date().toISOString();
    const category: StoredCategory = {
      id: this.createId(),
      name,
      nameKey: name.toLowerCase(),
      createdAt: now,
      updatedAt: now,
    };
    try {
      await this.add(CATEGORY_STORE, category);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'ConstraintError') {
        throw new RepositoryError('A category with this name already exists.', 'duplicate');
      }
      throw error;
    }
    return category;
  }

  async renameCategory(id: string, name: string): Promise<Category> {
    const normalizedName = name.trim();
    if (!normalizedName) {
      throw new RepositoryError('Category name is required.', 'storage');
    }

    const categories = await this.listCategories();
    if (
      categories.some(
        (category) =>
          category.id !== id && category.name.toLowerCase() === normalizedName.toLowerCase(),
      )
    ) {
      throw new RepositoryError('A category with this name already exists.', 'duplicate');
    }

    try {
      return await this.update<StoredCategory>(CATEGORY_STORE, id, (category) => ({
        ...category,
        name: normalizedName,
        nameKey: normalizedName.toLowerCase(),
        updatedAt: new Date().toISOString(),
      }));
    } catch (error) {
      if (error instanceof DOMException && error.name === 'ConstraintError') {
        throw new RepositoryError('A category with this name already exists.', 'duplicate');
      }
      throw error;
    }
  }

  async deleteCategory(id: string): Promise<void> {
    const database = await this.databasePromise;
    const transaction = database.transaction([CATEGORY_STORE, EXPENSE_STORE], 'readwrite');
    const completion = this.waitForTransaction(transaction);
    const expenseRequest = transaction.objectStore(EXPENSE_STORE).getAll() as IDBRequest<Expense[]>;
    const categoryRequest = transaction.objectStore(CATEGORY_STORE).get(id) as IDBRequest<
      Category | undefined
    >;
    let categoryInUse = false;
    let categoryExists = false;

    expenseRequest.onsuccess = () => {
      categoryInUse = expenseRequest.result.some((expense) => expense.categoryId === id);
      if (!categoryInUse && categoryExists) {
        transaction.objectStore(CATEGORY_STORE).delete(id);
      }
    };
    categoryRequest.onsuccess = () => {
      categoryExists = categoryRequest.result !== undefined;
      if (!categoryExists) {
        return;
      }
      if (expenseRequest.readyState === 'done') {
        categoryInUse = expenseRequest.result.some((expense) => expense.categoryId === id);
        if (!categoryInUse) {
          transaction.objectStore(CATEGORY_STORE).delete(id);
        }
      }
    };

    await completion;
    if (categoryInUse) {
      throw new RepositoryError(
        "Delete the category's expenses before deleting this category.",
        'in-use',
      );
    }
    if (!categoryExists) {
      throw new RepositoryError('Category not found.', 'not-found');
    }
  }

  async listIncomes(filter?: DateRange): Promise<Income[]> {
    const incomes = await this.getAll<Income>(INCOME_STORE);
    return this.filterByDate(incomes, filter, (income) => income.receivedOn);
  }

  async getIncome(id: string): Promise<Income | null> {
    return this.getById<Income>(INCOME_STORE, id);
  }

  async createIncome(input: NewIncome): Promise<Income> {
    const now = new Date().toISOString();
    const income: Income = {
      id: this.createId(),
      source: input.source.trim(),
      amount: input.amount,
      receivedOn: input.receivedOn,
      note: input.note?.trim() || null,
      createdAt: now,
      updatedAt: now,
    };
    await this.add(INCOME_STORE, income);
    return income;
  }

  async updateIncome(id: string, changes: UpdateIncome): Promise<Income> {
    return this.update<Income>(INCOME_STORE, id, (income) => ({
      ...income,
      ...changes,
      source: changes.source?.trim() ?? income.source,
      note: changes.note?.trim() || (changes.note === null ? null : income.note),
      updatedAt: new Date().toISOString(),
    }));
  }

  async deleteIncome(id: string): Promise<void> {
    await this.delete(INCOME_STORE, id);
  }

  async listExpenses(filter?: ExpenseFilter): Promise<Expense[]> {
    const expenses = await this.getAll<Expense>(EXPENSE_STORE);
    return this.filterByDate(expenses, filter, (expense) => expense.spentOn)
      .filter((expense) => !filter?.categoryId || expense.categoryId === filter.categoryId)
      .sort((left, right) => right.spentOn.localeCompare(left.spentOn));
  }

  async getExpense(id: string): Promise<Expense | null> {
    return this.getById<Expense>(EXPENSE_STORE, id);
  }

  async createExpense(input: NewExpense): Promise<Expense> {
    const now = new Date().toISOString();
    const expense: Expense = {
      id: this.createId(),
      categoryId: input.categoryId,
      amount: input.amount,
      spentOn: input.spentOn,
      note: input.note?.trim() || null,
      createdAt: now,
      updatedAt: now,
    };

    const database = await this.databasePromise;
    const transaction = database.transaction([CATEGORY_STORE, EXPENSE_STORE], 'readwrite');
    const completion = this.waitForTransaction(transaction);
    const categoryRequest = transaction.objectStore(CATEGORY_STORE).get(input.categoryId);
    let categoryExists = false;
    categoryRequest.onsuccess = () => {
      categoryExists = categoryRequest.result !== undefined;
      if (categoryExists) {
        transaction.objectStore(EXPENSE_STORE).add(expense);
      }
    };

    await completion;
    if (!categoryExists) {
      throw new RepositoryError('Choose a valid category.', 'not-found');
    }
    return expense;
  }

  async updateExpense(id: string, changes: UpdateExpense): Promise<Expense> {
    const database = await this.databasePromise;
    const transaction = database.transaction([CATEGORY_STORE, EXPENSE_STORE], 'readwrite');
    const completion = this.waitForTransaction(transaction);
    const expenseStore = transaction.objectStore(EXPENSE_STORE);
    const categoryStore = transaction.objectStore(CATEGORY_STORE);
    const expenseRequest = expenseStore.get(id) as IDBRequest<Expense | undefined>;
    let expenseExists = false;
    let categoryExists = true;
    let updated: Expense | undefined;

    expenseRequest.onsuccess = () => {
      const current = expenseRequest.result;
      expenseExists = current !== undefined;
      if (!current) {
        return;
      }

      const next: Expense = {
        ...current,
        ...changes,
        note: changes.note?.trim() || (changes.note === null ? null : current.note),
        updatedAt: new Date().toISOString(),
      };
      const categoryRequest = categoryStore.get(next.categoryId);
      categoryRequest.onsuccess = () => {
        categoryExists = categoryRequest.result !== undefined;
        if (categoryExists) {
          updated = next;
          expenseStore.put(next);
        }
      };
    };

    await completion;
    if (!expenseExists) {
      throw new RepositoryError('Record not found.', 'not-found');
    }
    if (!categoryExists) {
      throw new RepositoryError('Choose a valid category.', 'not-found');
    }
    if (!updated) {
      throw new RepositoryError('Expense could not be updated.', 'storage');
    }
    return updated;
  }

  async deleteExpense(id: string): Promise<void> {
    await this.delete(EXPENSE_STORE, id);
  }

  private async getAll<T>(storeName: string): Promise<T[]> {
    const database = await this.databasePromise;
    const transaction = database.transaction(storeName, 'readonly');
    const completion = this.waitForTransaction(transaction);
    const request = transaction.objectStore(storeName).getAll() as IDBRequest<T[]>;
    const result = await this.waitForRequest(request);
    await completion;
    return result;
  }

  private async getById<T>(storeName: string, id: string): Promise<T | null> {
    const database = await this.databasePromise;
    const transaction = database.transaction(storeName, 'readonly');
    const completion = this.waitForTransaction(transaction);
    const request = transaction.objectStore(storeName).get(id) as IDBRequest<T | undefined>;
    const result = await this.waitForRequest(request);
    await completion;
    return result ?? null;
  }

  private async add<T extends { id: string }>(storeName: string, record: T): Promise<void> {
    const database = await this.databasePromise;
    const transaction = database.transaction(storeName, 'readwrite');
    const completion = this.waitForTransaction(transaction);
    const request = transaction.objectStore(storeName).add(record);
    await this.waitForRequest(request);
    await completion;
  }

  private async update<T extends { id: string }>(
    storeName: string,
    id: string,
    change: (record: T) => T,
  ): Promise<T> {
    const database = await this.databasePromise;
    const transaction = database.transaction(storeName, 'readwrite');
    const completion = this.waitForTransaction(transaction);
    const store = transaction.objectStore(storeName);
    const request = store.get(id) as IDBRequest<T | undefined>;
    let updated: T | undefined;

    request.onsuccess = () => {
      if (request.result) {
        updated = change(request.result);
        store.put(updated);
      }
    };

    await completion;
    if (!updated) {
      throw new RepositoryError('Record not found.', 'not-found');
    }
    return updated;
  }

  private async delete(storeName: string, id: string): Promise<void> {
    const database = await this.databasePromise;
    const transaction = database.transaction(storeName, 'readwrite');
    const completion = this.waitForTransaction(transaction);
    const store = transaction.objectStore(storeName);
    const getRequest = store.get(id);
    let exists = false;

    getRequest.onsuccess = () => {
      exists = getRequest.result !== undefined;
      if (exists) {
        store.delete(id);
      }
    };

    await completion;
    if (!exists) {
      throw new RepositoryError('Record not found.', 'not-found');
    }
  }

  private filterByDate<T>(
    records: T[],
    filter: DateRange | undefined,
    dateFor: (record: T) => string,
  ): T[] {
    return records.filter((record) => {
      const date = dateFor(record);
      return (!filter?.from || date >= filter.from) && (!filter?.to || date <= filter.to);
    });
  }

  private openDatabase(): Promise<IDBDatabase> {
    if (typeof indexedDB === 'undefined') {
      return Promise.reject(
        new RepositoryError('IndexedDB is unavailable in this browser.', 'storage'),
      );
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
      request.onupgradeneeded = () => {
        const database = request.result;
        const transaction = request.transaction;
        if (!transaction) {
          reject(new RepositoryError('Could not initialize local storage.', 'storage'));
          return;
        }

        const categoryStore = database.createObjectStore(CATEGORY_STORE, { keyPath: 'id' });
        categoryStore.createIndex('nameKey', 'nameKey', { unique: true });
        database.createObjectStore(INCOME_STORE, { keyPath: 'id' });
        database.createObjectStore(EXPENSE_STORE, { keyPath: 'id' });
        const now = new Date().toISOString();
        for (const name of DEFAULT_CATEGORIES) {
          const category: StoredCategory = {
            id: this.createId(),
            name,
            nameKey: name.toLowerCase(),
            createdAt: now,
            updatedAt: now,
          };
          categoryStore.add(category);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () =>
        reject(request.error ?? new RepositoryError('Could not open local storage.', 'storage'));
      request.onblocked = () =>
        reject(new RepositoryError('Close other app tabs to update local storage.', 'storage'));
    });
  }

  private createId(): string {
    return crypto.randomUUID();
  }

  private waitForRequest<T>(request: IDBRequest<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () =>
        reject(request.error ?? new RepositoryError('Local storage request failed.', 'storage'));
    });
  }

  private waitForTransaction(transaction: IDBTransaction): Promise<void> {
    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onabort = () =>
        reject(
          transaction.error ??
            new RepositoryError('Local storage transaction was aborted.', 'storage'),
        );
      transaction.onerror = () =>
        reject(
          transaction.error ?? new RepositoryError('Local storage transaction failed.', 'storage'),
        );
    });
  }
}
