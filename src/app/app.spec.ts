import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { afterEach, vi } from 'vitest';
import { App } from './app';
import { ExpenseListComponent } from './features/expenses/expense-list.component';
import { IncomeListComponent } from './features/income/income-list.component';
import { CategoryListComponent } from './features/categories/category-list.component';
import { TRACKER_REPOSITORY } from './data/repositories/tracker-repository.token';
import { TrackerRepository } from './data/repositories/tracker-repository';
import { ThemeService } from './core/theme.service';
import { SavingsPlannerComponent } from './features/savings-planner/savings-planner.component';

const repositoryStub: TrackerRepository = {
  listCategories: async () => [{ id: 'category-food', name: 'Food', createdAt: '', updatedAt: '' }],
  getCategory: async () => null,
  createCategory: async () => ({ id: '', name: '', createdAt: '', updatedAt: '' }),
  renameCategory: async () => ({ id: '', name: '', createdAt: '', updatedAt: '' }),
  deleteCategory: async () => undefined,
  listIncomes: async () => [],
  getIncome: async () => null,
  createIncome: async () => ({
    id: '',
    source: '',
    amount: 0,
    receivedOn: '',
    note: null,
    createdAt: '',
    updatedAt: '',
  }),
  updateIncome: async () => ({
    id: '',
    source: '',
    amount: 0,
    receivedOn: '',
    note: null,
    createdAt: '',
    updatedAt: '',
  }),
  deleteIncome: async () => undefined,
  listExpenses: async () => [],
  getExpense: async () => null,
  createExpense: async () => ({
    id: '',
    categoryId: '',
    amount: 0,
    spentOn: '',
    note: null,
    createdAt: '',
    updatedAt: '',
  }),
  updateExpense: async () => ({
    id: '',
    categoryId: '',
    amount: 0,
    spentOn: '',
    note: null,
    createdAt: '',
    updatedAt: '',
  }),
  deleteExpense: async () => undefined,
};
const createExpenseSpy = vi.spyOn(repositoryStub, 'createExpense');
const createIncomeSpy = vi.spyOn(repositoryStub, 'createIncome');
const createCategorySpy = vi.spyOn(repositoryStub, 'createCategory');

describe('App', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.stubGlobal('localStorage', {
      getItem: vi.fn().mockReturnValue(null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    });
    await TestBed.configureTestingModule({
      imports: [
        App,
        ExpenseListComponent,
        IncomeListComponent,
        CategoryListComponent,
        SavingsPlannerComponent,
      ],
      providers: [provideRouter([]), { provide: TRACKER_REPOSITORY, useValue: repositoryStub }],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('dismisses the guest-mode notice', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const dismissButton = element.querySelector<HTMLButtonElement>(
      '[aria-label="Dismiss guest mode notice"]',
    );
    expect(dismissButton).not.toBeNull();
    dismissButton?.click();
    fixture.detectChanges();

    expect(element.querySelector('.guest-notice')).toBeNull();
  });

  it('opens the account sidebar with sign-in and create-account actions', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const openButton = element.querySelector<HTMLButtonElement>(
      '[aria-label="Open navigation menu"]',
    );
    expect(openButton).not.toBeNull();
    openButton?.click();
    fixture.detectChanges();

    expect(element.querySelector('#primary-sidebar')?.classList.contains('sidebar-open')).toBe(
      true,
    );
    expect(element.querySelector('.sidebar-account')?.textContent).toContain('Sign in');
    expect(element.querySelector('.sidebar-account')?.textContent).toContain('Create account');
  });

  it('cycles theme preferences and persists user overrides', () => {
    const theme = TestBed.inject(ThemeService);
    const storage = globalThis.localStorage;

    expect(theme.preference()).toBe('system');
    theme.cyclePreference();
    expect(theme.preference()).toBe('light');
    expect(storage.setItem).toHaveBeenCalledWith('hisaab-theme', 'light');

    theme.cyclePreference();
    expect(theme.preference()).toBe('dark');
    expect(storage.setItem).toHaveBeenCalledWith('hisaab-theme', 'dark');

    theme.cyclePreference();
    expect(theme.preference()).toBe('system');
    expect(storage.removeItem).toHaveBeenCalledWith('hisaab-theme');
  });

  it('should render the expenses screen', async () => {
    const fixture = TestBed.createComponent(ExpenseListComponent);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Expenses');
  });

  it('creates an expense from valid form values', async () => {
    const fixture = TestBed.createComponent(ExpenseListComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.componentInstance.form.setValue({
      categoryId: 'category-food',
      amount: '12.50',
      spentOn: '2026-11-11',
      note: 'Lunch',
    });
    await fixture.componentInstance.saveExpense();

    expect(createExpenseSpy).toHaveBeenCalledWith({
      categoryId: 'category-food',
      amount: 12.5,
      spentOn: '2026-11-11',
      note: 'Lunch',
    });
  });

  it('creates an income record from valid form values', async () => {
    const fixture = TestBed.createComponent(IncomeListComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.componentInstance.form.setValue({
      source: ' Freelance ',
      amount: '125.50',
      receivedOn: '2026-11-10',
      note: ' Project ',
    });
    await fixture.componentInstance.saveIncome();

    expect(createIncomeSpy).toHaveBeenCalledWith({
      source: 'Freelance',
      amount: 125.5,
      receivedOn: '2026-11-10',
      note: 'Project',
    });
  });

  it('creates a category from a trimmed name', async () => {
    const fixture = TestBed.createComponent(CategoryListComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.componentInstance.form.controls.name.setValue(' Health ');
    await fixture.componentInstance.saveCategory();

    expect(createCategorySpy).toHaveBeenCalledWith({ name: 'Health' });
  });

  it('loads current-month records for the savings planner without persisting a goal', async () => {
    const fixture = TestBed.createComponent(SavingsPlannerComponent);
    await fixture.componentInstance.ngOnInit();

    expect(fixture.componentInstance.currentMonthNetSavings()).toBe(0);
    expect(fixture.componentInstance.plan()).toBeNull();
  });
});
