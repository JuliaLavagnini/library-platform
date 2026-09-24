import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { ApiError } from '../api/client.ts';
import { useAuth } from '../auth/AuthContext.tsx';
import { FormField } from '../components/FormField.tsx';

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [error, setError] = useState<ApiError | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSubmitting(true);
    setError(null);
    try {
      await register(
        String(form.get('name')),
        String(form.get('email')),
        String(form.get('password')),
      );
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError(0, undefined));
    } finally {
      setSubmitting(false);
    }
  }

  // Field problems are shown next to each field; anything else at the top.
  const generalError = error && error.details.length === 0 ? error.message : null;

  return (
    <div className="card auth-card">
      <h1>Create an account</h1>
      <p className="muted">Membership is free. You'll get a membership ID straight away.</p>

      <form className="form" onSubmit={handleSubmit} noValidate>
        {generalError && (
          <div className="alert error" role="alert">
            {generalError === 'A record with this email already exists'
              ? 'An account with this email already exists. Try logging in instead.'
              : generalError}
          </div>
        )}
        <FormField
          label="Name"
          name="name"
          autoComplete="name"
          required
          error={error?.fieldError('name')}
        />
        <FormField
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          required
          error={error?.fieldError('email')}
        />
        <FormField
          label="Password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={12}
          required
          hint="At least 12 characters. A few random words make a strong, memorable password."
          error={error?.fieldError('password')}
        />
        <button type="submit" className="button" disabled={submitting}>
          {submitting ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      <p className="muted">
        Already a member? <Link to="/login">Log in</Link>
      </p>
    </div>
  );
}
