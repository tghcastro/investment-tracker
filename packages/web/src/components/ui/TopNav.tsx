import { useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useHoldingTypes } from '../../hooks';
import { showDevBadge } from '../../showDevBadge';
import { Button } from './Button';
import './TopNav.css';

const NAV_ITEMS = [
  { to: '/', label: 'Home', end: true },
  { to: '/income', label: 'Income', end: false },
  { to: '/settings', label: 'Settings', end: false },
  { to: '/accounts', label: 'Accounts', end: false },
] as const;

const HOLDINGS_ROUTE_BY_SLUG: Record<string, string | null> = {
  bond: '/holdings',
  'brazilian-fixed-income': null,
};

function HoldingsNavItem({ onNavigate }: { onNavigate: () => void }) {
  const { data: types, loading } = useHoldingTypes();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const isHoldingsActive = location.pathname.startsWith('/holdings');

  const handleToggle = () => setOpen((value) => !value);

  return (
    <li
      className={`cb-top-nav__item cb-top-nav__item--submenu${
        open ? ' cb-top-nav__item--open' : ''
      }`}
    >
      <button
        type="button"
        className={`cb-top-nav__link cb-top-nav__link--submenu${
          isHoldingsActive ? ' cb-top-nav__link--active' : ''
        }`}
        aria-expanded={open}
        aria-haspopup="true"
        aria-controls="holdings-submenu"
        onClick={handleToggle}
      >
        Holdings
      </button>
      <ul id="holdings-submenu" className="cb-top-nav__submenu" role="menu">
        {loading ? (
          <li role="none">
            <span className="cb-top-nav__submenu-placeholder">Loading…</span>
          </li>
        ) : (
          types?.map((type) => {
            const route = HOLDINGS_ROUTE_BY_SLUG[type.slug];
            if (route) {
              return (
                <li key={type.id} role="none">
                  <NavLink
                    to={route}
                    role="menuitem"
                    className={({ isActive }) =>
                      isActive
                        ? 'cb-top-nav__submenu-link cb-top-nav__submenu-link--active'
                        : 'cb-top-nav__submenu-link'
                    }
                    onClick={() => {
                      setOpen(false);
                      onNavigate();
                    }}
                  >
                    {type.name}
                  </NavLink>
                </li>
              );
            }

            return (
              <li key={type.id} role="none">
                <span
                  className="cb-top-nav__submenu-item cb-top-nav__submenu-item--disabled"
                  aria-disabled="true"
                  role="menuitem"
                >
                  <span>{type.name}</span>
                  <span className="cb-top-nav__submenu-caption">Coming in v2</span>
                </span>
              </li>
            );
          })
        )}
      </ul>
    </li>
  );
}

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
            {NAV_ITEMS.slice(0, 1).map(({ to, label, end }) => (
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
            <HoldingsNavItem onNavigate={closeMenu} />
            {NAV_ITEMS.slice(1).map(({ to, label, end }) => (
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
