import { useQueryClient } from '@tanstack/react-query';
import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { setAccessToken, setUnauthorizedHandler, unwrap, usersApi } from '../api/client.ts';
import type { AuthResult, User } from '../api/types.ts';

// Who is logged in, shared across the app.
//
// The access token is kept in memory and in sessionStorage: it survives a page reload but
// not closing the tab, and it's never stored long-term. It expires after 15 minutes; the
// user is then logged out automatically.

const STORAGE_KEY = 'library.session';

interface Session {
  token: string;
  user: User;
  expiresAt: number;
}

interface AuthContextValue {
  user: User | null;
  isLibrarian: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function loadSession(): Session | null {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    const session = stored ? (JSON.parse(stored) as Session) : null;
    return session && session.expiresAt > Date.now() ? session : null;
  } catch {
    return null;
  }
}

function toSession(result: AuthResult): Session {
  return {
    token: result.accessToken,
    user: result.user,
    expiresAt: Date.now() + result.expiresIn * 1000,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(() => {
    const restored = loadSession();
    setAccessToken(restored?.token ?? null);
    return restored;
  });

  const save = useCallback((next: Session | null) => {
    setAccessToken(next?.token ?? null);
    try {
      if (next) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      else sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // Storage can be unavailable (e.g. private browsing); the session still works in memory.
    }
    setSession(next);
  }, []);

  const logout = useCallback(() => {
    save(null);
    // Drop cached data that belonged to the previous user.
    queryClient.clear();
  }, [save, queryClient]);

  // Log out when the token expires, or when the API says it's no longer valid.
  useEffect(() => {
    setUnauthorizedHandler(logout);
    if (!session) return;
    const timer = setTimeout(logout, session.expiresAt - Date.now());
    return () => clearTimeout(timer);
  }, [session, logout]);

  const login = useCallback(
    async (email: string, password: string) => {
      const result = await unwrap(usersApi.POST('/api/auth/login', { body: { email, password } }));
      save(toSession(result));
    },
    [save],
  );

  const register = useCallback(
    async (name: string, email: string, password: string) => {
      const result = await unwrap(
        usersApi.POST('/api/auth/register', { body: { name, email, password } }),
      );
      save(toSession(result));
    },
    [save],
  );

  const value = useMemo(
    () => ({
      user: session?.user ?? null,
      isLibrarian: session?.user.role === 'librarian',
      login,
      register,
      logout,
    }),
    [session, login, register, logout],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth() {
  const context = use(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
}
