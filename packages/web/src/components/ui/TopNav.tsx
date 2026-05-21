import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Button } from './Button';
import './TopNav.css';

const NAV_ITEMS = [
  { to: '/', label: 'Home', end: true },
  { to: '/holdings', label: 'Holdings', end: false },
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
          <Button variant="primary" disabled>
            Add holding
          </Button>
        </div>
      </div>
    </header>
  );
}
