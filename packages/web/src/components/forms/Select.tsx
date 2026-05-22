import type { SelectHTMLAttributes } from 'react';
import './forms.css';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  options: SelectOption[];
  error?: boolean;
}

export function Select({ options, error = false, className = '', id, ...rest }: SelectProps) {
  const classes = ['cb-select', error ? 'cb-select--error' : '', className]
    .filter(Boolean)
    .join(' ');

  return (
    <select
      id={id}
      className={classes}
      aria-invalid={error || undefined}
      aria-describedby={error && id ? `${id}-error` : undefined}
      {...rest}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
