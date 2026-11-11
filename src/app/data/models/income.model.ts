export interface Income {
  id: string;
  userId?: string;
  source: string;
  amount: number;
  receivedOn: string;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}
