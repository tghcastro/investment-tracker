import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { focusFirstFieldError } from '../utils/focusFirstFieldError';
import { FormField, TextInput } from './forms';
import { Button } from './ui/Button';
import './AccountForm.css';

export interface AccountFormValues {
  name: string;
  description: string;
  currencyCodes: string[];
}

export interface AccountFormSubmitPayload {
  name: string;
  description?: string;
  currencyCodes: string[];
}

export interface AccountFormProps {
  initialValues?: Partial<AccountFormValues>;
  currencyOptions: Array<{ code: string; name: string }>;
  serverFieldErrors?: Record<string, string[]> | null;
  submitLabel?: string;
  loading?: boolean;
  archived?: boolean;
  showArchive?: boolean;
  onSubmit: (payload: AccountFormSubmitPayload) => void;
  onArchive?: () => void;
  onCancel: () => void;
}

const ACCOUNT_FORM_FIELD_FOCUS_ORDER = [
  { id: 'account-name', errorKey: 'name' },
  { id: 'account-description', errorKey: 'description' },
] as const;

export const EMPTY_ACCOUNT_FORM_VALUES: AccountFormValues = {
  name: '',
  description: '',
  currencyCodes: ['USD'],
};

function mergeFieldErrors(
  clientErrors: Record<string, string>,
  serverErrors?: Record<string, string[]> | null
): Record<string, string> {
  const merged = { ...clientErrors };
  if (serverErrors) {
    for (const [key, messages] of Object.entries(serverErrors)) {
      if (messages[0]) {
        merged[key] = messages[0];
      }
    }
  }
  return merged;
}

function validate(values: AccountFormValues): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!values.name.trim()) {
    errors.name = 'Account name required';
  }
  if (values.currencyCodes.length === 0) {
    errors.currencyCodes = 'Select at least one currency';
  }
  return errors;
}

export function AccountForm({
  initialValues,
  currencyOptions,
  serverFieldErrors,
  submitLabel = 'Save account',
  loading = false,
  archived = false,
  showArchive = false,
  onSubmit,
  onArchive,
  onCancel,
}: AccountFormProps) {
  const [values, setValues] = useState<AccountFormValues>(() => ({
    ...EMPTY_ACCOUNT_FORM_VALUES,
    ...initialValues,
  }));
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (initialValues) {
      setValues((current) => ({ ...current, ...initialValues }));
    }
  }, [initialValues]);

  const fieldErrors = useMemo(() => {
    if (!submitted && !serverFieldErrors) {
      return clientErrors;
    }
    return mergeFieldErrors(submitted ? clientErrors : {}, serverFieldErrors);
  }, [clientErrors, serverFieldErrors, submitted]);

  useEffect(() => {
    if (Object.keys(fieldErrors).length === 0) {
      return;
    }
    if (!submitted && !serverFieldErrors) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      focusFirstFieldError(ACCOUNT_FORM_FIELD_FOCUS_ORDER, fieldErrors);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [fieldErrors, submitted, serverFieldErrors]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);
    const errors = validate(values);
    setClientErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    const payload: AccountFormSubmitPayload = {
      name: values.name.trim(),
      currencyCodes: values.currencyCodes,
    };
    if (values.description.trim()) {
      payload.description = values.description.trim();
    }
    onSubmit(payload);
  };

  return (
    <form className="cb-account-form" onSubmit={handleSubmit} noValidate>
      {archived ? (
        <p className="cb-account-form__notice" role="status">
          This account is archived. You can update the description but not the name.
        </p>
      ) : null}

      <FormField label="Account name" htmlFor="account-name" error={fieldErrors.name}>
        <TextInput
          id="account-name"
          value={values.name}
          error={Boolean(fieldErrors.name)}
          onChange={(event) => setValues((current) => ({ ...current, name: event.target.value }))}
          disabled={loading || archived}
        />
      </FormField>

      <FormField label="Description (optional)" htmlFor="account-description" error={fieldErrors.description}>
        <TextInput
          id="account-description"
          value={values.description}
          error={Boolean(fieldErrors.description)}
          onChange={(event) =>
            setValues((current) => ({ ...current, description: event.target.value }))
          }
          disabled={loading}
        />
      </FormField>

      <FormField
        label="Allowed currencies"
        htmlFor="account-currencies"
        error={fieldErrors.currencyCodes}
      >
        <div id="account-currencies" className="cb-account-form__currency-grid">
          {currencyOptions.map((currency) => {
            const checked = values.currencyCodes.includes(currency.code);
            return (
              <label key={currency.code} className="cb-account-form__currency-option">
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={loading || archived}
                  onChange={(event) => {
                    setValues((current) => {
                      const next = event.target.checked
                        ? [...current.currencyCodes, currency.code]
                        : current.currencyCodes.filter((code) => code !== currency.code);
                      return { ...current, currencyCodes: next };
                    });
                  }}
                />
                <span>
                  {currency.code} — {currency.name}
                </span>
              </label>
            );
          })}
        </div>
      </FormField>

      <div
        className={`cb-account-form__actions${showArchive ? ' cb-account-form__actions--split' : ''}`}
      >
        {showArchive && onArchive && !archived ? (
          <Button type="button" variant="secondary-light" onClick={onArchive} disabled={loading}>
            Archive account
          </Button>
        ) : null}
        <div className="cb-account-form__actions-group">
          <Button type="button" variant="secondary-light" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={loading}>
            {submitLabel}
          </Button>
        </div>
      </div>
    </form>
  );
}
