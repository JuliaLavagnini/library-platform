import { Route, Routes } from 'react-router';
import { AuthProvider } from './auth/AuthContext.tsx';
import { Layout } from './components/Layout.tsx';
import { RequireAuth } from './components/RequireAuth.tsx';
import { BooksPage } from './pages/BooksPage.tsx';
import { LoginPage } from './pages/LoginPage.tsx';
import { MyLoansPage } from './pages/MyLoansPage.tsx';
import { AllLoansPage } from './pages/librarian/AllLoansPage.tsx';
import { ManageBooksPage } from './pages/librarian/ManageBooksPage.tsx';
import { MembersPage } from './pages/librarian/MembersPage.tsx';
import { NotFoundPage } from './pages/NotFoundPage.tsx';
import { RegisterPage } from './pages/RegisterPage.tsx';

export function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<BooksPage />} />
          <Route path="login" element={<LoginPage />} />
          <Route path="register" element={<RegisterPage />} />
          <Route
            path="loans"
            element={
              <RequireAuth>
                <MyLoansPage />
              </RequireAuth>
            }
          />
          <Route
            path="librarian/books"
            element={
              <RequireAuth role="librarian">
                <ManageBooksPage />
              </RequireAuth>
            }
          />
          <Route
            path="librarian/loans"
            element={
              <RequireAuth role="librarian">
                <AllLoansPage />
              </RequireAuth>
            }
          />
          <Route
            path="librarian/members"
            element={
              <RequireAuth role="librarian">
                <MembersPage />
              </RequireAuth>
            }
          />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}
