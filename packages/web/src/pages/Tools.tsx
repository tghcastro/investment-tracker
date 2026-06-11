import { Link } from 'react-router-dom';
import { PageHeader } from '../components/ui';
import './Accounts.css';
import './Tools.css';

const TOOL_CARDS = [
  {
    to: '/tools/backup-restore',
    title: 'Backup / Restore',
    description: 'Download a SQLite backup or restore your portfolio from a backup file.',
  },
] as const;

export default function Tools() {
  return (
    <div className="cb-tools-page">
      <PageHeader
        title="Tools"
        subtitle="Utilities for maintenance, imports, and calculations"
      />

      <div className="cb-accounts-grid">
        {TOOL_CARDS.map((tool) => (
          <Link key={tool.to} to={tool.to} className="cb-tools-card">
            <h2 className="cb-accounts-card__name">{tool.title}</h2>
            <p className="cb-tools-card__description">{tool.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
