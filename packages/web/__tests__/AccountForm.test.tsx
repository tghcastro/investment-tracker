import { render, screen } from '@testing-library/react';
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
});
