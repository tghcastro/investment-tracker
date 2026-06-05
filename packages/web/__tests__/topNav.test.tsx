import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TopNav } from '../src/components/ui/TopNav';

const MOBILE_QUERY = '(max-width: 767px)';

const MOCK_HOLDING_TYPES = [
  { id: '1', slug: 'bond', name: 'Bond', sortOrder: 10 },
  { id: '2', slug: 'brazilian-fixed-income', name: 'Brazilian Fixed Income', sortOrder: 20 },
];

function mockMatchMedia(isMobile: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query === MOBILE_QUERY ? isMobile : false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

function mockHoldingTypesFetch() {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/api/holding-types')) {
        return Promise.resolve({
          ok: true,
          json: async () => MOCK_HOLDING_TYPES,
        });
      }
      return Promise.resolve({
        ok: false,
        status: 404,
        json: async () => ({}),
      });
    })
  );
}

describe('TopNav responsive behavior', () => {
  beforeEach(() => {
    mockMatchMedia(true);
    mockHoldingTypesFetch();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('keeps mobile nav closed until the hamburger toggle is clicked', async () => {
    render(
      <MemoryRouter>
        <TopNav />
      </MemoryRouter>
    );

    const menuToggle = screen.getByRole('button', { name: 'Open menu' });
    const mainNav = screen.getByRole('navigation', { name: 'Main' });

    expect(window.matchMedia(MOBILE_QUERY).matches).toBe(true);
    expect(menuToggle).toHaveClass('cb-top-nav__menu-toggle');
    expect(menuToggle).toHaveAttribute('aria-expanded', 'false');
    expect(mainNav).not.toHaveClass('cb-top-nav__center--open');
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Holdings' })).toBeInTheDocument();
    });
  });

  it('opens mobile nav sheet when menu toggle is clicked', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <TopNav />
      </MemoryRouter>
    );

    const menuToggle = screen.getByRole('button', { name: 'Open menu' });
    await user.click(menuToggle);

    expect(screen.getByRole('navigation', { name: 'Main' })).toHaveClass(
      'cb-top-nav__center--open'
    );
    expect(menuToggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('button', { name: 'Close menu' })).toBeInTheDocument();
  });

  it('closes mobile nav sheet when the toggle is clicked again', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <TopNav />
      </MemoryRouter>
    );

    const menuToggle = screen.getByRole('button', { name: 'Open menu' });
    await user.click(menuToggle);
    await user.click(screen.getByRole('button', { name: 'Close menu' }));

    expect(screen.getByRole('navigation', { name: 'Main' })).not.toHaveClass(
      'cb-top-nav__center--open'
    );
    expect(screen.getByRole('button', { name: 'Open menu' })).toHaveAttribute(
      'aria-expanded',
      'false'
    );
  });

  it('does not require a menu toggle interaction on wide viewports', async () => {
    mockMatchMedia(false);

    render(
      <MemoryRouter>
        <TopNav />
      </MemoryRouter>
    );

    const mainNav = screen.getByRole('navigation', { name: 'Main' });

    expect(window.matchMedia(MOBILE_QUERY).matches).toBe(false);
    expect(mainNav).not.toHaveClass('cb-top-nav__center--open');
    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'Accounts' })).toBeInTheDocument();
    });
    expect(screen.queryByRole('button', { name: 'Close menu' })).not.toBeInTheDocument();
  });

  it('shows a red DEV badge when running the Vite dev server', () => {
    mockMatchMedia(false);

    render(
      <MemoryRouter>
        <TopNav />
      </MemoryRouter>
    );

    expect(screen.getByText('DEV')).toHaveClass('cb-top-nav__env-badge');
    expect(screen.getByLabelText('Development mode')).toBeInTheDocument();
  });

  it('enables Add holding link to /holdings/new', () => {
    mockMatchMedia(false);

    render(
      <MemoryRouter>
        <TopNav />
      </MemoryRouter>
    );

    const addLink = screen.getByRole('link', { name: 'Add holding' });
    expect(addLink).toHaveAttribute('href', '/holdings/new');
    expect(addLink.querySelector('button')).not.toBeDisabled();
  });

  it('includes Income nav link to /income', () => {
    mockMatchMedia(false);

    render(
      <MemoryRouter>
        <TopNav />
      </MemoryRouter>
    );

    expect(screen.getByRole('link', { name: 'Income' })).toHaveAttribute('href', '/income');
  });

  it('includes Market Indicators nav link to /market-indicators', () => {
    mockMatchMedia(false);

    render(
      <MemoryRouter>
        <TopNav />
      </MemoryRouter>
    );

    expect(screen.getByRole('link', { name: 'Market Indicators' })).toHaveAttribute(
      'href',
      '/market-indicators'
    );
  });

  it('includes Settings nav link to /settings', () => {
    mockMatchMedia(false);

    render(
      <MemoryRouter>
        <TopNav />
      </MemoryRouter>
    );

    expect(screen.getByRole('link', { name: 'Settings' })).toHaveAttribute('href', '/settings');
  });

  it('renders holdings submenu from API with Bond and BRFI links', async () => {
    mockMatchMedia(false);
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <TopNav />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('menuitem', { name: 'Bond' })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Holdings' }));

    expect(screen.getByRole('menuitem', { name: 'Bond' })).toHaveAttribute('href', '/holdings');
    expect(screen.getByRole('menuitem', { name: 'Brazilian Fixed Income' })).toHaveAttribute(
      'href',
      '/holdings/brazilian-fixed-income'
    );
    expect(screen.queryByText('Coming in v2')).not.toBeInTheDocument();
  });
});
