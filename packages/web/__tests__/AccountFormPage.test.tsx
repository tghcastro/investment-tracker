import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import AccountFormPage from '../src/pages/AccountFormPage';

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

describe('AccountFormPage', () => {
  it('create mode renders account form', () => {
    mockUseApi.mockReturnValue({ data: undefined, loading: false, error: undefined });

    render(
      <MemoryRouter>
        <AccountFormPage mode="create" />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: 'Add account' })).toBeInTheDocument();
    expect(screen.getByLabelText('Account name')).toBeInTheDocument();
  });
});
