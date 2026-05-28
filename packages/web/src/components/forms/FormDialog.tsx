import type { ReactNode } from 'react';
import './forms.css';

export interface FormDialogProps {
  open: boolean;
  title: string;
  titleId?: string;
  onClose: () => void;
  children: ReactNode;
}

export function FormDialog({
  open,
  title,
  titleId = 'form-dialog-title',
  onClose,
  children,
}: FormDialogProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="cb-confirm-dialog__overlay" role="presentation" onClick={onClose}>
      <div
        className="cb-form-dialog__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id={titleId} className="cb-form-dialog__title">
          {title}
        </h2>
        {children}
      </div>
    </div>
  );
}
