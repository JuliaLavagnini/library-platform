import { useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { useMemberLoans, useReturnLoan } from '../api/loans.ts';
import type { Loan } from '../api/types.ts';
import { useAuth } from '../auth/AuthContext.tsx';
import { LoanStatus } from '../components/LoanStatus.tsx';
import { formatDate } from '../format.ts';

export function MyLoansPage() {
  const { user } = useAuth();
  const loans = useMemberLoans(user?.id);
  const returnLoan = useReturnLoan();
  const [error, setError] = useState<string | null>(null);

  const active = loans.data?.filter((loan) => loan.status === 'active') ?? [];
  const history = loans.data?.filter((loan) => loan.status === 'returned') ?? [];
  const overdueCount = active.filter((loan) => loan.overdue).length;

  function handleReturn(loan: Loan) {
    setError(null);
    returnLoan.mutate(
      { userId: loan.userId, loanId: loan.id },
      { onError: (err) => setError(err.message) },
    );
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1>My loans</h1>
          {user && <p className="muted">Membership ID: {user.membershipId}</p>}
        </div>
        <Link to="/" className="button secondary">
          Browse books
        </Link>
      </div>

      {overdueCount > 0 && (
        <div className="alert error" role="alert" style={{ marginBottom: '1rem' }}>
          {overdueCount === 1
            ? 'One of your books is overdue. Please return it as soon as you can.'
            : `${overdueCount} of your books are overdue. Please return them as soon as you can.`}
        </div>
      )}

      {error && (
        <div className="alert error" role="alert" style={{ marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {loans.isPending && <p className="muted">Loading your loans…</p>}
      {loans.isError && (
        <div className="alert error" role="alert">
          Couldn't load your loans: {loans.error.message}
        </div>
      )}

      {loans.data && (
        <>
          <section className="card" aria-labelledby="current-heading">
            <h2 id="current-heading">On loan ({active.length})</h2>
            {active.length === 0 ? (
              <p className="muted">
                You have no books on loan. <Link to="/">Find something to read</Link>.
              </p>
            ) : (
              <LoanTable
                loans={active}
                renderAction={(loan) => (
                  <button
                    type="button"
                    className="button small"
                    disabled={returnLoan.isPending}
                    onClick={() => handleReturn(loan)}
                    aria-label={`Return ${loan.bookTitle}`}
                  >
                    Return
                  </button>
                )}
              />
            )}
          </section>

          {history.length > 0 && (
            <section
              className="card"
              style={{ marginTop: '1.5rem' }}
              aria-labelledby="history-heading"
            >
              <h2 id="history-heading">History</h2>
              <LoanTable loans={history} />
            </section>
          )}
        </>
      )}
    </>
  );
}

function LoanTable({
  loans,
  renderAction,
}: {
  loans: Loan[];
  renderAction?: (loan: Loan) => ReactNode;
}) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th scope="col">Book</th>
            <th scope="col">Borrowed</th>
            <th scope="col">Due</th>
            <th scope="col">Returned</th>
            <th scope="col">Status</th>
            {renderAction && (
              <th scope="col">
                <span className="sr-only">Actions</span>
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {loans.map((loan) => (
            <tr key={loan.id}>
              <td>{loan.bookTitle}</td>
              <td>{formatDate(loan.borrowedAt)}</td>
              <td>{formatDate(loan.dueAt)}</td>
              <td>{formatDate(loan.returnedAt)}</td>
              <td>
                <LoanStatus loan={loan} />
              </td>
              {renderAction && <td>{renderAction(loan)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
