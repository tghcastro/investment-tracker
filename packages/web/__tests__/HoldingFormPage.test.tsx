import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import HoldingFormPage from '../src/pages/HoldingFormPage';
import type { ApiAccount } from '../src/types/api';

const mockUseApi = vi.fn();
const mockMutate = vi.fn();

vi.mock('../src/hooks/useApi', () => ({
  useApi: (url: string) => mockUseApi(url),
}));

vi.mock('../src/hooks/useApiMutation', () => ({
  useApiMutation: () => ({
    mutate: mockMutate,
    loading: false,
    error: null,
    fieldErrors: null,
  }),
}));

const sampleAccounts: ApiAccount[] = [
  {
    id: '10',
    name: 'Vanguard',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  },
];

describe('HoldingFormPage', () => {
  it('create mode renders form when accounts exist', () => {
    mockUseApi.mockImplementation((url: string) => {
      if (url === '/api/accounts') {
        return { data: sampleAccounts, loading: false, error: undefined };
      }
      return { data: undefined, loading: false, error: undefined };
    });

    render(
      <MemoryRouter>
        <HoldingFormPage mode="create" />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: 'Add holding' })).toBeInTheDocument();
    expect(screen.getByLabelText('Issuer')).toBeInTheDocument();
  });

  it('create mode shows empty state when no accounts', () => {
    mockUseApi.mockImplementation((url: string) => {
      if (url === '/api/accounts') {
        return { data: [], loading: false, error: undefined };
      }
      return { data: undefined, loading: false, error: undefined };
    });

    render(
      <MemoryRouter>
        <HoldingFormPage mode="create" />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: 'No accounts yet' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Add account' })).toHaveAttribute('href', '/accounts/new');
  });
});
