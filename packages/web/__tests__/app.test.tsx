import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import App from '../src/App';

vi.mock('../src/hooks/useApi', () => ({
  useApi: vi.fn(() => ({
    data: [],
    loading: false,
    error: undefined,
  })),
}));

describe('App', () => {
  it('renders router, nav links, and home page', () => {
    render(<App />);

    expect(screen.getByRole('link', { name: 'Investment Tracker' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: 'Holdings' })).toHaveAttribute('href', '/holdings');
    expect(screen.getByRole('link', { name: 'Accounts' })).toHaveAttribute('href', '/accounts');
    expect(screen.getByRole('heading', { name: 'Bond portfolio' })).toBeInTheDocument();
  });
});
