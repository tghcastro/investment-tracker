import { Link } from 'react-router-dom';
import type { ApiBrFiHolding } from '../types/api';
import {
  PRODUCT_TYPE_LABELS,
  formatBrFiIndexingSummary,
} from '../utils/brFiLabels';
import { formatCurrency, formatDate, issuerInitials } from '../utils/format';
import { Button } from './ui/Button';
import './BrFiHoldingsTable.css';

export interface AccountInfo {
  name: string;
  archived: boolean;
}

export interface BrFiHoldingsTableProps {
  holdings: ApiBrFiHolding[];
  accountInfo: Map<string, AccountInfo>;
  onDelete: (id: string) => void;
}

function formatConvertedInvested(holding: ApiBrFiHolding): string {
  if (holding.convertedInvestedAmountCents === null) {
    return '—';
  }
  return formatCurrency(holding.convertedInvestedAmountCents, holding.convertedCurrency);
}

function formatAccountLabel(info: AccountInfo | undefined): string {
  if (!info) {
    return 'Unknown account';
  }
  return info.archived ? `${info.name} (archived)` : info.name;
}

export function BrFiHoldingsTable({ holdings, accountInfo, onDelete }: BrFiHoldingsTableProps) {
  return (
    <div className="cb-brfi-holdings-table" role="list">
      {holdings.map((holding) => {
        const accountLabel = formatAccountLabel(accountInfo.get(holding.accountId));

        return (
          <article key={holding.id} className="cb-brfi-holdings-table__row" role="listitem">
            <div className="cb-brfi-holdings-table__name-block">
              <div className="cb-brfi-holdings-table__icon" aria-hidden="true">
                {issuerInitials(holding.name)}
              </div>
              <div className="cb-brfi-holdings-table__labels">
                <div className="cb-brfi-holdings-table__title-row">
                  <h2 className="cb-brfi-holdings-table__name" title="Name">
                    {holding.name}
                  </h2>
                  <span className="cb-brfi-holdings-table__type-badge">
                    {PRODUCT_TYPE_LABELS[holding.productType]}
                  </span>
                </div>
                <p className="cb-brfi-holdings-table__account" title="Account">
                  {accountLabel} · {holding.currencyCode}
                </p>
              </div>
            </div>
            <div className="cb-brfi-holdings-table__metrics">
              <span
                className="cb-brfi-holdings-table__indexing cb-body-sm"
                title="Indexing"
              >
                {formatBrFiIndexingSummary(holding)}
              </span>
              <span
                className="cb-brfi-holdings-table__maturity cb-body-sm"
                title="Maturity Date"
              >
                {formatDate(holding.maturityDate)}
              </span>
              <div className="cb-brfi-holdings-table__amounts">
                <span
                  className="cb-brfi-holdings-table__amount cb-number-display"
                  title="Converted Invested Amount"
                >
                  {formatConvertedInvested(holding)}
                </span>
                <span
                  className="cb-brfi-holdings-table__amount-native cb-body-sm"
                  title="Invested Amount"
                >
                  {formatCurrency(holding.investedAmountCents, holding.currencyCode)}
                </span>
              </div>
            </div>
            <div className="cb-brfi-holdings-table__actions">
              <Link
                to={`/holdings/brazilian-fixed-income/${holding.id}`}
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

export function BrFiHoldingsTableSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div
      className="cb-brfi-holdings-table cb-brfi-holdings-table--loading"
      aria-busy="true"
      aria-label="Loading Brazilian fixed income holdings"
    >
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="cb-brfi-holdings-table__skeleton-row">
          <div className="cb-brfi-holdings-table__skeleton-icon" />
          <div className="cb-brfi-holdings-table__skeleton-lines">
            <div className="cb-brfi-holdings-table__skeleton-line cb-brfi-holdings-table__skeleton-line--wide" />
            <div className="cb-brfi-holdings-table__skeleton-line cb-brfi-holdings-table__skeleton-line--narrow" />
          </div>
          <div className="cb-brfi-holdings-table__skeleton-metrics">
            <div className="cb-brfi-holdings-table__skeleton-line cb-brfi-holdings-table__skeleton-line--metric" />
            <div className="cb-brfi-holdings-table__skeleton-line cb-brfi-holdings-table__skeleton-line--metric" />
          </div>
        </div>
      ))}
    </div>
  );
}
