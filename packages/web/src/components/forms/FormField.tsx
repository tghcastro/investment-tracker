import type { ReactNode } from 'react';
import './forms.css';

export interface FormFieldProps {
  label: string;
  htmlFor: string;
  error?: string;
  children: ReactNode;
}

export function FormField({ label, htmlFor, error, children }: FormFieldProps) {
  return (
    <div className="cb-form-field">
      <label htmlFor={htmlFor} className="cb-form-field__label">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} className="cb-form-field__error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
