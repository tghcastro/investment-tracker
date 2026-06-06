import { useEffect, useState, type MouseEvent } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useHoldingTypes } from '../../hooks';
import { showDevBadge } from '../../showDevBadge';
import {
  HOLDINGS_LIST_ROUTE_BY_SLUG,
  HOLDINGS_NEW_ROUTE_BY_SLUG,
} from '../../utils/holdingTypeRoutes';
import './TopNav.css';

const NAV_ITEMS = [
  { to: '/', label: 'Home', end: true },
  { to: '/income', label: 'Income', end: false },
  { to: '/settings', label: 'Settings', end: false },
] as const;

const REFERENCE_NAV_ITEMS = [
  { to: '/market-indicators', label: 'Market Indicators' },
  { to: '/currencies', label: 'Currencies' },
  { to: '/accounts', label: 'Accounts' },
] as const;

function isReferenceActive(pathname: string): boolean {
  return REFERENCE_NAV_ITEMS.some(({ to }) => pathname.startsWith(to));
}

function useSubmenuOpenState() {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') {
      setIsMobile(false);
      return;
    }

    const mediaQuery = window.matchMedia('(max-width: 767px)');
    const syncMobile = () => setIsMobile(mediaQuery.matches);
    syncMobile();
    mediaQuery.addEventListener('change', syncMobile);
    return () => mediaQuery.removeEventListener('change', syncMobile);
  }, []);

  const closeSubmenu = () => {
    setOpen(false);
  };

  const handleMouseLeave = (event: MouseEvent<HTMLLIElement>) => {
    setOpen(false);
    event.currentTarget.querySelector('button')?.blur();
  };

  return { open, setOpen, isMobile, closeSubmenu, handleMouseLeave };
}

function HoldingsNavItem({ onNavigate }: { onNavigate: () => void }) {
  const { data: types, loading } = useHoldingTypes();
  const location = useLocation();
  const { open, setOpen, isMobile, closeSubmenu, handleMouseLeave } = useSubmenuOpenState();
  const isHoldingsActive = location.pathname.startsWith('/holdings');

  return (
    <li
      className={`cb-top-nav__item cb-top-nav__item--submenu${
        open ? ' cb-top-nav__item--open' : ''
      }`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={handleMouseLeave}
    >
      <button
        type="button"
        className={`cb-top-nav__link cb-top-nav__link--submenu${
          isHoldingsActive ? ' cb-top-nav__link--active' : ''
        }`}
        aria-expanded={open}
        aria-haspopup="true"
        aria-controls="holdings-submenu"
        onClick={isMobile ? () => setOpen((value) => !value) : undefined}
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
            const route = HOLDINGS_LIST_ROUTE_BY_SLUG[type.slug];
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
                      closeSubmenu();
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

function ReferenceNavItem({ onNavigate }: { onNavigate: () => void }) {
  const location = useLocation();
  const { open, setOpen, isMobile, closeSubmenu, handleMouseLeave } = useSubmenuOpenState();
  const isReferenceNavActive = isReferenceActive(location.pathname);

  return (
    <li
      className={`cb-top-nav__item cb-top-nav__item--submenu${
        open ? ' cb-top-nav__item--open' : ''
      }`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={handleMouseLeave}
    >
      <button
        type="button"
        className={`cb-top-nav__link cb-top-nav__link--submenu${
          isReferenceNavActive ? ' cb-top-nav__link--active' : ''
        }`}
        aria-expanded={open}
        aria-haspopup="true"
        aria-controls="reference-submenu"
        onClick={isMobile ? () => setOpen((value) => !value) : undefined}
      >
        Reference
      </button>
      <ul id="reference-submenu" className="cb-top-nav__submenu" role="menu">
        {REFERENCE_NAV_ITEMS.map(({ to, label }) => (
          <li key={to} role="none">
            <NavLink
              to={to}
              role="menuitem"
              className={({ isActive }) =>
                isActive
                  ? 'cb-top-nav__submenu-link cb-top-nav__submenu-link--active'
                  : 'cb-top-nav__submenu-link'
              }
              onClick={() => {
                closeSubmenu();
                onNavigate();
              }}
            >
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
    </li>
  );
}

function AddHoldingNavItem() {
  const { data: types, loading } = useHoldingTypes();
  const { open, setOpen, isMobile, closeSubmenu, handleMouseLeave } = useSubmenuOpenState();

  return (
    <div
      className={`cb-top-nav__item cb-top-nav__item--submenu cb-top-nav__item--cta${
        open ? ' cb-top-nav__item--open' : ''
      }`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={handleMouseLeave}
    >
      <button
        type="button"
        className="cb-button cb-button--primary cb-top-nav__cta-trigger"
        aria-expanded={open}
        aria-haspopup="true"
        aria-controls="add-holding-submenu"
        onClick={isMobile ? () => setOpen((value) => !value) : undefined}
      >
        Add holding
      </button>
      <ul
        id="add-holding-submenu"
        className="cb-top-nav__submenu cb-top-nav__submenu--cta"
        role="menu"
      >
        {loading ? (
          <li role="none">
            <span className="cb-top-nav__submenu-placeholder">Loading…</span>
          </li>
        ) : (
          types?.map((type) => {
            const route = HOLDINGS_NEW_ROUTE_BY_SLUG[type.slug];
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
                    onClick={closeSubmenu}
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
    </div>
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
            {NAV_ITEMS.slice(1, 2).map(({ to, label, end }) => (
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
            <ReferenceNavItem onNavigate={closeMenu} />
            {NAV_ITEMS.slice(2).map(({ to, label, end }) => (
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
          <AddHoldingNavItem />
        </div>
      </div>
    </header>
  );
}
