import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import Currencies from '../src/pages/Currencies';

const mockUseApi = vi.fn();

vi.mock('../src/hooks/useApi', () => ({
  useApi: (url: string) => mockUseApi(url),
}));

describe('Currencies page', () => {
  it('renders currency catalog from API', () => {
    mockUseApi.mockReturnValue({
      data: [
        {
          code: 'USD',
          number: '840',
          name: 'US Dollar',
          symbol: '$',
          region: 'United States',
        },
        {
          code: 'BRL',
          number: '986',
          name: 'Brazilian Real',
          symbol: 'R$',
          region: 'Brazil',
        },
      ],
      loading: false,
      error: undefined,
    });

    render(
      <MemoryRouter>
        <Currencies />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: 'Currencies' })).toBeInTheDocument();
    expect(screen.getByText('US Dollar')).toBeInTheDocument();
    expect(screen.getByText('Brazilian Real')).toBeInTheDocument();
  });
});
