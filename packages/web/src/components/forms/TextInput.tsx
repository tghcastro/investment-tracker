import type { InputHTMLAttributes } from 'react';
import './forms.css';

export interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export function TextInput({ error = false, className = '', id, ...rest }: TextInputProps) {
  const classes = ['cb-text-input', error ? 'cb-text-input--error' : '', className]
    .filter(Boolean)
    .join(' ');

  return (
    <input
      id={id}
      className={classes}
      aria-invalid={error || undefined}
      aria-describedby={error && id ? `${id}-error` : undefined}
      {...rest}
    />
  );
}
