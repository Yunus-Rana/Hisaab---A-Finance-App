export interface Expense {
  id: string;
  userId?: string;
  categoryId: string;
  amount: number;
  spentOn: string;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}
