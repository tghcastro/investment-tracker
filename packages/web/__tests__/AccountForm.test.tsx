import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { AccountForm } from '../src/components/AccountForm';

describe('AccountForm', () => {
  it('requires account name on submit', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(<AccountForm onSubmit={onSubmit} onCancel={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Save account' }));
    expect(screen.getByText('Account name required')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('focuses the account name field on client validation failure', async () => {
    const user = userEvent.setup();

    render(<AccountForm onSubmit={vi.fn()} onCancel={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Save account' }));

    await waitFor(() => {
      expect(document.activeElement).toBe(screen.getByLabelText('Account name'));
    });
  });

  it('focuses the first server error field when client validation is clean', async () => {
    render(
      <AccountForm
        initialValues={{ name: 'Brokerage', description: '' }}
        serverFieldErrors={{ description: ['Description too long'] }}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(document.activeElement).toBe(screen.getByLabelText('Description (optional)'));
    });
  });
});
