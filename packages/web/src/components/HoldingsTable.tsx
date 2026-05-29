import { Link } from 'react-router-dom';
import type { ApiBondHolding } from '../types/api';
import { formatCouponRate, formatCurrency, formatDate, issuerInitials } from '../utils/format';
import { Button } from './ui/Button';
import './HoldingsTable.css';

export interface AccountInfo {
  name: string;
  archived: boolean;
}

export interface HoldingsTableProps {
  holdings: ApiBondHolding[];
  accountInfo: Map<string, AccountInfo>;
  onDelete: (id: string) => void;
}

function formatAccountLabel(info: AccountInfo | undefined): string {
  if (!info) {
    return 'Unknown account';
  }
  return info.archived ? `${info.name} (archived)` : info.name;
}

export function HoldingsTable({ holdings, accountInfo, onDelete }: HoldingsTableProps) {
  return (
    <div className="cb-holdings-table" role="list">
      {holdings.map((holding) => {
        const accountLabel = formatAccountLabel(accountInfo.get(holding.accountId));

        return (
          <article key={holding.id} className="cb-holdings-table__row" role="listitem">
            <div className="cb-holdings-table__issuer-block">
              <div className="cb-holdings-table__icon" aria-hidden="true">
                {issuerInitials(holding.issuer)}
              </div>
              <div className="cb-holdings-table__labels">
                <div className="cb-holdings-table__title-row">
                  <h2 className="cb-holdings-table__issuer">{holding.issuer}</h2>
                  {holding.holdingType ? (
                    <span className="cb-holdings-table__type-badge">{holding.holdingType.name}</span>
                  ) : null}
                </div>
                <p className="cb-holdings-table__account">{accountLabel}</p>
              </div>
            </div>
            <div className="cb-holdings-table__metrics">
              <span className="cb-holdings-table__coupon cb-number-display">
                {formatCouponRate(holding.couponRate)}
              </span>
              <span className="cb-holdings-table__maturity cb-body-sm">
                {formatDate(holding.maturityDate)}
              </span>
              <span className="cb-holdings-table__face-value cb-number-display">
                {formatCurrency(holding.faceValue)}
              </span>
            </div>
            <div className="cb-holdings-table__actions">
              <Link
                to={`/holdings/${holding.id}`}
                className="cb-button cb-button--tertiary-text"
              >
                Edit
              </Link>
              <Button variant="secondary-light" onClick={() => onDelete(holding.id)}>
                Delete
              </Button>
            </div>
          </article>
        );
      })}
    </div>
  );
}

export function HoldingsTableSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="cb-holdings-table cb-holdings-table--loading" aria-busy="true" aria-label="Loading holdings">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="cb-holdings-table__skeleton-row">
          <div className="cb-holdings-table__skeleton-icon" />
          <div className="cb-holdings-table__skeleton-lines">
            <div className="cb-holdings-table__skeleton-line cb-holdings-table__skeleton-line--wide" />
            <div className="cb-holdings-table__skeleton-line cb-holdings-table__skeleton-line--narrow" />
          </div>
          <div className="cb-holdings-table__skeleton-metrics">
            <div className="cb-holdings-table__skeleton-line cb-holdings-table__skeleton-line--metric" />
            <div className="cb-holdings-table__skeleton-line cb-holdings-table__skeleton-line--metric" />
          </div>
        </div>
      ))}
    </div>
  );
}
