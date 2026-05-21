import type { ReactNode } from 'react';
import './EmptyState.css';

export interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="cb-empty-state">
      <div className="cb-empty-state__card">
        <h2 className="cb-empty-state__title">{title}</h2>
        {description ? <p className="cb-empty-state__description">{description}</p> : null}
        {action ? <div className="cb-empty-state__action">{action}</div> : null}
      </div>
    </div>
  );
}
