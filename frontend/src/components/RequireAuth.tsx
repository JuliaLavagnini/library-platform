import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import type { Role } from '../api/types.ts';
import { useAuth } from '../auth/AuthContext.tsx';

// Wraps pages that need a login (and optionally a role). Logged-out visitors are sent to
// the login page, then brought back here afterwards.
//
// This only decides what the UI shows. The real protection is in the services, which
// check every request's token themselves.
export function RequireAuth({ role, children }: { role?: Role; children: ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (role && user.role !== role) {
    return (
      <div className="card empty" role="alert">
        <h1>Not allowed</h1>
        <p>This page is for librarians only.</p>
      </div>
    );
  }

  return children;
}
