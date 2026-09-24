import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useDeferredValue, useState, type FormEvent } from 'react';
import { ApiError, unwrap, usersApi } from '../../api/client.ts';
import type { Role, User } from '../../api/types.ts';
import { useAuth } from '../../auth/AuthContext.tsx';
import { FormField } from '../../components/FormField.tsx';
import { formatDate } from '../../format.ts';

export function MembersPage() {
  const { user: me } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search.trim());
  const [showAddForm, setShowAddForm] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const members = useQuery({
    queryKey: ['users', deferredSearch],
    queryFn: () =>
      unwrap(
        usersApi.GET('/api/users', {
          params: { query: deferredSearch ? { search: deferredSearch } : {} },
        }),
      ),
    placeholderData: (previous) => previous,
  });

  const createAccount = useMutation({
    mutationFn: (body: { name: string; email: string; password: string; role: Role }) =>
      unwrap(usersApi.POST('/api/users', { body })),
    onSuccess: (user) => {
      setNotice({
        type: 'success',
        text: `Created ${user.role} account for ${user.name} (${user.membershipId}).`,
      });
      setShowAddForm(false);
      void queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const deleteMember = useMutation({
    mutationFn: (member: User) =>
      unwrap(usersApi.DELETE('/api/users/{id}', { params: { path: { id: member.id } } })),
    onSuccess: (_data, member) => {
      setNotice({ type: 'success', text: `Deleted ${member.name}'s account.` });
      void queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (error) =>
      setNotice({
        type: 'error',
        text: error.message.includes('still have books on loan')
          ? 'This member still has books on loan. They need to be returned first.'
          : error.message,
      }),
  });

  function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setNotice(null);
    createAccount.mutate({
      name: String(form.get('name')),
      email: String(form.get('email')),
      password: String(form.get('password')),
      role: form.get('role') === 'librarian' ? 'librarian' : 'member',
    });
  }

  const createError = createAccount.error instanceof ApiError ? createAccount.error : null;

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Members</h1>
          <p className="muted">Find members, create accounts, and close accounts.</p>
        </div>
        <button
          type="button"
          className="button"
          aria-expanded={showAddForm}
          onClick={() => setShowAddForm((open) => !open)}
        >
          {showAddForm ? 'Cancel' : 'Create account'}
        </button>
      </div>

      {notice && (
        <div
          className={`alert ${notice.type}`}
          role={notice.type === 'error' ? 'alert' : 'status'}
          style={{ marginBottom: '1rem' }}
        >
          {notice.text}
        </div>
      )}

      {showAddForm && (
        <section
          className="card"
          aria-labelledby="create-heading"
          style={{ marginBottom: '1.5rem' }}
        >
          <h2 id="create-heading">Create an account</h2>
          <form className="form" onSubmit={handleCreate} noValidate>
            {createError && createError.details.length === 0 && (
              <div className="alert error" role="alert">
                {createError.message === 'A record with this email already exists'
                  ? 'An account with this email already exists.'
                  : createError.message}
              </div>
            )}
            <div className="grid">
              <FormField
                label="Name"
                name="name"
                required
                error={createError?.fieldError('name')}
              />
              <FormField
                label="Email"
                name="email"
                type="email"
                required
                error={createError?.fieldError('email')}
              />
              <FormField
                label="Temporary password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                hint="At least 12 characters. Share it with the member securely."
                error={createError?.fieldError('password')}
              />
              <div className="field">
                <label htmlFor="new-role">Role</label>
                <select id="new-role" name="role" defaultValue="member">
                  <option value="member">Member</option>
                  <option value="librarian">Librarian</option>
                </select>
              </div>
            </div>
            <div>
              <button type="submit" className="button" disabled={createAccount.isPending}>
                {createAccount.isPending ? 'Creating…' : 'Create account'}
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="card">
        <div className="toolbar" style={{ marginBottom: '1rem' }}>
          <label className="sr-only" htmlFor="member-search">
            Search members
          </label>
          <input
            id="member-search"
            type="search"
            placeholder="Search by name, email or membership ID"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        {members.isPending && <p className="muted">Loading…</p>}
        {members.isError && (
          <div className="alert error" role="alert">
            {members.error.message}
          </div>
        )}
        {members.data?.length === 0 && <p className="empty">No members match your search.</p>}
        {members.data && members.data.length > 0 && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">Email</th>
                  <th scope="col">Membership ID</th>
                  <th scope="col">Role</th>
                  <th scope="col">Joined</th>
                  <th scope="col">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {members.data.map((member) => (
                  <tr key={member.id}>
                    <td>{member.name}</td>
                    <td>{member.email}</td>
                    <td className="muted">{member.membershipId}</td>
                    <td>
                      <span
                        className={`badge ${member.role === 'librarian' ? 'warning' : 'neutral'}`}
                      >
                        {member.role}
                      </span>
                    </td>
                    <td>{formatDate(member.createdAt)}</td>
                    <td>
                      {member.id !== me?.id && (
                        <button
                          type="button"
                          className="button danger small"
                          disabled={deleteMember.isPending}
                          onClick={() => {
                            if (
                              window.confirm(
                                `Delete ${member.name}'s account? Their loan history is kept.`,
                              )
                            ) {
                              setNotice(null);
                              deleteMember.mutate(member);
                            }
                          }}
                          aria-label={`Delete ${member.name}`}
                        >
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
