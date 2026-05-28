import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ConfirmDialog, FormField, Select, TextInput } from '../src/components/forms';
import { focusFirstFieldError } from '../src/utils/focusFirstFieldError';

describe('focusFirstFieldError', () => {
  it('focuses the first field in order that has an error', () => {
    document.body.innerHTML = `
      <input id="first-field" />
      <input id="second-field" />
    `;
    const firstField = document.getElementById('first-field')!;
    const secondField = document.getElementById('second-field')!;
    const firstFocus = vi.spyOn(firstField, 'focus');
    const secondFocus = vi.spyOn(secondField, 'focus');

    focusFirstFieldError(
      [
        { id: 'first-field', errorKey: 'first' },
        { id: 'second-field', errorKey: 'second' },
      ],
      { second: 'Second error', first: 'First error' }
    );

    expect(firstFocus).toHaveBeenCalledTimes(1);
    expect(secondFocus).not.toHaveBeenCalled();
  });

  it('skips missing elements and focuses the next field with an error', () => {
    document.body.innerHTML = `<input id="second-field" />`;
    const secondField = document.getElementById('second-field')!;
    const secondFocus = vi.spyOn(secondField, 'focus');

    focusFirstFieldError(
      [
        { id: 'missing-field', errorKey: 'missing' },
        { id: 'second-field', errorKey: 'second' },
      ],
      { missing: 'Missing error', second: 'Second error' }
    );

    expect(secondFocus).toHaveBeenCalledTimes(1);
  });
});

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
