import type { Loan } from '../api/types.ts';
import { formatRelativeDays } from '../format.ts';

export function LoanStatus({ loan }: { loan: Loan }) {
  if (loan.status === 'returned') {
    return <span className="badge neutral">Returned</span>;
  }
  if (loan.overdue) {
    return <span className="badge danger">Overdue ({formatRelativeDays(loan.dueAt)})</span>;
  }
  return <span className="badge success">Due {formatRelativeDays(loan.dueAt)}</span>;
}
