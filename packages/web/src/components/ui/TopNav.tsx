import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { showDevBadge } from '../../showDevBadge';
import { Button } from './Button';
import './TopNav.css';

const NAV_ITEMS = [
  { to: '/', label: 'Home', end: true },
  { to: '/holdings', label: 'Holdings', end: false },
  { to: '/income', label: 'Income', end: false },
  { to: '/accounts', label: 'Accounts', end: false },
] as const;

export function TopNav() {
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = () => setMenuOpen(false);

  return (
    <header className="cb-top-nav">
      <div className="cb-top-nav__inner">
        <div className="cb-top-nav__left">
          <NavLink to="/" end className="cb-top-nav__wordmark" onClick={closeMenu}>
            Investment Tracker
          </NavLink>
          {showDevBadge() ? (
            <span className="cb-top-nav__env-badge" aria-label="Development mode">
              DEV
            </span>
          ) : null}
        </div>

        <button
          type="button"
          className="cb-top-nav__menu-toggle"
          aria-expanded={menuOpen}
          aria-controls="main-nav"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span className="cb-top-nav__menu-icon" aria-hidden="true" />
        </button>

        <nav
          id="main-nav"
          className={`cb-top-nav__center${menuOpen ? ' cb-top-nav__center--open' : ''}`}
          aria-label="Main"
        >
          <ul className="cb-top-nav__links">
            {NAV_ITEMS.map(({ to, label, end }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    isActive ? 'cb-top-nav__link cb-top-nav__link--active' : 'cb-top-nav__link'
                  }
                  onClick={closeMenu}
                >
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="cb-top-nav__right">
          <Link to="/holdings/new" className="cb-top-nav__cta">
            <Button variant="primary">Add holding</Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
