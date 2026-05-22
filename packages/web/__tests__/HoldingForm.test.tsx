import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { HoldingForm } from '../src/components/HoldingForm';
import type { ApiAccount } from '../src/types/api';

const sampleAccounts: ApiAccount[] = [
  {
    id: '10',
    name: 'Vanguard',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  },
];

describe('HoldingForm', () => {
  it('renders fields and blocks submit with validation message', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(
      <HoldingForm
        accounts={sampleAccounts}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByLabelText('Issuer')).toBeInTheDocument();
    expect(screen.getByLabelText('Account')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Save holding' }));

    expect(screen.getByText('Issuer required')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('merges server field errors', () => {
    render(
      <HoldingForm
        accounts={sampleAccounts}
        initialValues={{
          accountId: '10',
          issuer: 'US Treasury',
          faceValue: '1000',
          couponRate: '4.25',
          maturityDate: '2030-01-01',
          purchaseDate: '2024-01-01',
        }}
        serverFieldErrors={{ accountId: ['Account is archived'] }}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByText('Account is archived')).toBeInTheDocument();
  });
});
