import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { unwrap, usersApi } from '../../api/client.ts';
import { useReturnLoan } from '../../api/loans.ts';
import { LoanStatus } from '../../components/LoanStatus.tsx';
import { formatDate } from '../../format.ts';

const FILTERS = [
  { value: 'overdue', label: 'Overdue' },
  { value: 'active', label: 'On loan' },
  { value: 'returned', label: 'Returned' },
  { value: 'all', label: 'All' },
] as const;

type Filter = (typeof FILTERS)[number]['value'];

export function AllLoansPage() {
  const [filter, setFilter] = useState<Filter>('overdue');
  const [error, setError] = useState<string | null>(null);
  const returnLoan = useReturnLoan();

  const loans = useQuery({
    queryKey: ['loans', 'all', filter],
    queryFn: () =>
      unwrap(
        usersApi.GET('/api/loans', {
          params: { query: filter === 'all' ? {} : { status: filter } },
        }),
      ),
  });

  // Loans only store the member's id; look up names to show who has each book.
  const members = useQuery({
    queryKey: ['users', ''],
    queryFn: () => unwrap(usersApi.GET('/api/users')),
  });
  const memberById = new Map(members.data?.map((member) => [member.id, member]));

  return (
    <>
      <div className="page-header">
        <div>
          <h1>All loans</h1>
          <p className="muted">Every member's loans. Return books handed in at the desk here.</p>
        </div>
        <div className="field" style={{ minWidth: '12rem' }}>
          <label htmlFor="loan-filter">Show</label>
          <select
            id="loan-filter"
            value={filter}
            onChange={(event) => setFilter(event.target.value as Filter)}
          >
            {FILTERS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="alert error" role="alert" style={{ marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      <section className="card">
        {loans.isPending && <p className="muted">Loading…</p>}
        {loans.isError && (
          <div className="alert error" role="alert">
            {loans.error.message}
          </div>
        )}
        {loans.data?.length === 0 && (
          <p className="empty">
            {filter === 'overdue' ? 'No overdue loans. Everything is on time.' : 'No loans.'}
          </p>
        )}
        {loans.data && loans.data.length > 0 && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th scope="col">Book</th>
                  <th scope="col">Member</th>
                  <th scope="col">Borrowed</th>
                  <th scope="col">Due</th>
                  <th scope="col">Status</th>
                  <th scope="col">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {loans.data.map((loan) => {
                  const member = memberById.get(loan.userId);
                  return (
                    <tr key={loan.id}>
                      <td>{loan.bookTitle}</td>
                      <td>
                        {member ? (
                          <>
                            {member.name}
                            <br />
                            <span className="muted">{member.membershipId}</span>
                          </>
                        ) : (
                          <span className="muted">Deleted member</span>
                        )}
                      </td>
                      <td>{formatDate(loan.borrowedAt)}</td>
                      <td>{formatDate(loan.dueAt)}</td>
                      <td>
                        <LoanStatus loan={loan} />
                      </td>
                      <td>
                        {loan.status === 'active' && (
                          <button
                            type="button"
                            className="button secondary small"
                            disabled={returnLoan.isPending}
                            onClick={() => {
                              setError(null);
                              returnLoan.mutate(
                                { userId: loan.userId, loanId: loan.id },
                                { onError: (err) => setError(err.message) },
                              );
                            }}
                            aria-label={`Mark ${loan.bookTitle} as returned`}
                          >
                            Mark returned
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
