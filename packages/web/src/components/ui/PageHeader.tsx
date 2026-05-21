import type { ReactNode } from 'react';
import './PageHeader.css';

export type PageHeaderTitleVariant = 'display-sm' | 'title-lg';

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  titleVariant?: PageHeaderTitleVariant;
  action?: ReactNode;
}

export function PageHeader({
  title,
  subtitle,
  titleVariant = 'display-sm',
  action,
}: PageHeaderProps) {
  const titleClass =
    titleVariant === 'title-lg' ? 'cb-page-header__title--lg' : 'cb-page-header__title--display';

  return (
    <header className="cb-page-header">
      <div className="cb-page-header__text">
        <h1 className={`cb-page-header__title ${titleClass}`}>{title}</h1>
        {subtitle ? <p className="cb-page-header__subtitle">{subtitle}</p> : null}
      </div>
      {action ? <div className="cb-page-header__action">{action}</div> : null}
    </header>
  );
}
