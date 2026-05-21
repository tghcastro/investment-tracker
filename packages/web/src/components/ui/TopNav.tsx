import { NavLink } from 'react-router-dom';
import { Button } from './Button';
import './TopNav.css';

const NAV_ITEMS = [
  { to: '/', label: 'Home', end: true },
  { to: '/holdings', label: 'Holdings', end: false },
  { to: '/accounts', label: 'Accounts', end: false },
] as const;

export function TopNav() {
  return (
    <header className="cb-top-nav">
      <div className="cb-top-nav__inner">
        <div className="cb-top-nav__left">
          <NavLink to="/" end className="cb-top-nav__wordmark">
            Investment Tracker
          </NavLink>
        </div>
        <nav className="cb-top-nav__center" aria-label="Main">
          <ul className="cb-top-nav__links">
            {NAV_ITEMS.map(({ to, label, end }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    isActive ? 'cb-top-nav__link cb-top-nav__link--active' : 'cb-top-nav__link'
                  }
                >
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className="cb-top-nav__right">
          <Button variant="primary" disabled>
            Add holding
          </Button>
        </div>
      </div>
    </header>
  );
}
