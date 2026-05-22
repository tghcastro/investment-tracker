import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { FormField, TextInput } from './forms';
import { Button } from './ui/Button';
import './AccountForm.css';

export interface AccountFormValues {
  name: string;
  description: string;
}

export interface AccountFormSubmitPayload {
  name: string;
  description?: string;
}

export interface AccountFormProps {
  initialValues?: Partial<AccountFormValues>;
  serverFieldErrors?: Record<string, string[]> | null;
  submitLabel?: string;
  loading?: boolean;
  archived?: boolean;
  showArchive?: boolean;
  onSubmit: (payload: AccountFormSubmitPayload) => void;
  onArchive?: () => void;
  onCancel: () => void;
}

export const EMPTY_ACCOUNT_FORM_VALUES: AccountFormValues = {
  name: '',
  description: '',
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
  return errors;
}

export function AccountForm({
  initialValues,
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
