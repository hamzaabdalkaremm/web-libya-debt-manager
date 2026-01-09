
export enum DebtType {
  LENT = 'LENT', // أنا سلفته (لي عنده)
  BORROWED = 'BORROWED' // هو سلفني (عليّ دين)
}

export enum DebtStatus {
  PENDING = 'PENDING',
  PAID = 'PAID'
}

export interface Debt {
  id: string;
  contactName: string;
  amount: number;
  type: DebtType;
  date: string;
  dueDate?: string;
  notes: string;
  status: DebtStatus;
}

export interface DashboardStats {
  totalLent: number;
  totalBorrowed: number;
  balance: number;
}
