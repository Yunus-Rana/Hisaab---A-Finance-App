import { Routes } from '@angular/router';
import { CategoryListComponent } from './features/categories/category-list.component';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { ExpenseListComponent } from './features/expenses/expense-list.component';
import { IncomeListComponent } from './features/income/income-list.component';
import { SavingsPlannerComponent } from './features/savings-planner/savings-planner.component';

export const routes: Routes = [
  { path: '', component: DashboardComponent, title: 'Overview | Hisaab' },
  { path: 'expenses', component: ExpenseListComponent, title: 'Expenses | Hisaab' },
  { path: 'income', component: IncomeListComponent, title: 'Income | Hisaab' },
  { path: 'categories', component: CategoryListComponent, title: 'Categories | Hisaab' },
  {
    path: 'savings-planner',
    component: SavingsPlannerComponent,
    title: 'Savings planner | Hisaab',
  },
  { path: '**', redirectTo: '' },
];
