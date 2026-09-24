import { Link, NavLink, Outlet } from 'react-router';
import { useAuth } from '../auth/AuthContext.tsx';

export function Layout() {
  const { user, isLibrarian, logout } = useAuth();

  return (
    <>
      <header className="site-header">
        <div className="container">
          <Link to="/" className="brand">
            <img src="/favicon.svg" alt="" width={26} height={26} />
            Library
          </Link>

          <nav className="nav" aria-label="Main">
            <NavLink to="/" end>
              Books
            </NavLink>
            {user && <NavLink to="/loans">My loans</NavLink>}
            {isLibrarian && <NavLink to="/librarian/books">Manage books</NavLink>}
            {isLibrarian && <NavLink to="/librarian/loans">All loans</NavLink>}
            {isLibrarian && <NavLink to="/librarian/members">Members</NavLink>}
          </nav>

          <div className="account">
            {user ? (
              <>
                <span className="muted">
                  {user.name}
                  {isLibrarian && ' (librarian)'}
                </span>
                <button type="button" className="button secondary small" onClick={logout}>
                  Log out
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="button secondary small">
                  Log in
                </Link>
                <Link to="/register" className="button small">
                  Sign up
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="container page">
        <Outlet />
      </main>
    </>
  );
}
