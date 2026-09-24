import { screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { member } from './fixtures.ts';
import { renderApp } from './render.tsx';
import { apiError, server } from './server.ts';

const loginResult = {
  user: member,
  accessToken: 'new-token',
  tokenType: 'Bearer',
  expiresIn: 900,
};

describe('logging in', () => {
  it('shows the API error for a wrong password', async () => {
    server.use(http.post('/api/auth/login', () => apiError(401, 'Invalid email or password')));
    const { user } = renderApp('/login');

    await user.type(screen.getByLabelText('Email'), 'ada@example.com');
    await user.type(screen.getByLabelText('Password'), 'wrong password');
    await user.click(screen.getByRole('button', { name: 'Log in' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password');
  });

  it('sends people back to the page they were trying to open', async () => {
    server.use(http.post('/api/auth/login', () => HttpResponse.json(loginResult)));
    const { user } = renderApp('/loans');

    // Not logged in: sent to the login page first.
    expect(await screen.findByRole('heading', { name: 'Log in' })).toBeVisible();

    await user.type(screen.getByLabelText('Email'), 'ada@example.com');
    await user.type(screen.getByLabelText('Password'), 'correct horse battery staple');
    await user.click(screen.getByRole('button', { name: 'Log in' }));

    expect(await screen.findByRole('heading', { name: 'My loans' })).toBeVisible();
    expect(screen.getByText('Ada Lovelace')).toBeVisible();
  });

  it('keeps the token for this browser tab only', async () => {
    server.use(http.post('/api/auth/login', () => HttpResponse.json(loginResult)));
    const { user } = renderApp('/login');

    await user.type(screen.getByLabelText('Email'), 'ada@example.com');
    await user.type(screen.getByLabelText('Password'), 'correct horse battery staple');
    await user.click(screen.getByRole('button', { name: 'Log in' }));

    await screen.findByRole('button', { name: 'Log out' });
    expect(sessionStorage.getItem('library.session')).toContain('new-token');
    expect(localStorage.length).toBe(0);
  });
});

describe('signing up', () => {
  it("shows the API's validation messages next to each field", async () => {
    server.use(
      http.post('/api/auth/register', () =>
        apiError(400, 'Validation failed', [
          { path: 'email', message: 'Email must be a valid email address' },
          { path: 'password', message: 'Password must be at least 12 characters' },
        ]),
      ),
    );
    const { user } = renderApp('/register');

    await user.type(screen.getByLabelText('Name'), 'Ada');
    await user.type(screen.getByLabelText('Email'), 'not-an-email');
    await user.type(screen.getByLabelText('Password'), 'short');
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByText('Email must be a valid email address')).toBeVisible();
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('Password')).toHaveAccessibleDescription(
      /Password must be at least 12 characters/,
    );
  });
});

describe('sessions', () => {
  it('logs out when the API says the token is no longer valid', async () => {
    server.use(http.get('/api/users/:id/loans', () => apiError(401, 'Invalid or expired token')));
    renderApp('/', { as: member });

    const header = screen.getByRole('banner');
    expect(await within(header).findByRole('link', { name: 'Log in' })).toBeVisible();
    expect(sessionStorage.getItem('library.session')).toBeNull();
  });

  it('logs out on request', async () => {
    const { user } = renderApp('/', { as: member });

    await user.click(await screen.findByRole('button', { name: 'Log out' }));

    expect(screen.getByRole('link', { name: 'Sign up' })).toBeVisible();
    expect(screen.queryByRole('link', { name: 'My loans' })).not.toBeInTheDocument();
  });
});

describe('librarian pages', () => {
  it('are refused to members', async () => {
    renderApp('/librarian/books', { as: member });

    expect(await screen.findByRole('heading', { name: 'Not allowed' })).toBeVisible();
    expect(screen.queryByRole('link', { name: 'Manage books' })).not.toBeInTheDocument();
  });
});
