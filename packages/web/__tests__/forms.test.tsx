import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ConfirmDialog, FormField, Select, TextInput } from '../src/components/forms';

describe('form primitives', () => {
  it('FormField renders label and error', () => {
    render(
      <FormField label="Issuer" htmlFor="issuer" error="Issuer required">
        <TextInput id="issuer" />
      </FormField>
    );

    expect(screen.getByLabelText('Issuer')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Issuer required');
  });

  it('TextInput applies error state', () => {
    render(<TextInput id="issuer" error aria-label="Issuer" />);
    expect(screen.getByRole('textbox', { name: 'Issuer' })).toHaveClass('cb-text-input--error');
  });

  it('Select renders options', () => {
    render(
      <Select
        id="frequency"
        aria-label="Coupon frequency"
        options={[
          { value: 'annual', label: 'Annual' },
          { value: 'semi-annual', label: 'Semi-annual' },
        ]}
      />
    );

    expect(screen.getByRole('combobox', { name: 'Coupon frequency' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Annual' })).toBeInTheDocument();
  });

  it('ConfirmDialog calls confirm and cancel handlers', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onCancel = vi.fn();

    render(
      <ConfirmDialog
        open
        title="Delete holding?"
        message="This cannot be undone."
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    );

    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
