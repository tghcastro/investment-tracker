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
      expect(screen.getByRole('button', { name: 'Configurations' })).toBeInTheDocument();
    });
    expect(screen.getByRole('link', { name: 'Accounts' })).toHaveAttribute('href', '/accounts');
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

  it('shows Add holding submenu with Bond and BRFI create links', async () => {
    mockMatchMedia(false);
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <TopNav />
      </MemoryRouter>
    );

    const addButton = screen.getByRole('button', { name: 'Add holding' });
    expect(addButton).not.toBeDisabled();

    const addItem = addButton.closest('.cb-top-nav__item--cta');
    expect(addItem).not.toBeNull();

    await user.hover(addItem!);

    const addSubmenu = document.getElementById('add-holding-submenu');
    expect(addSubmenu).not.toBeNull();

    await waitFor(() => {
      expect(addSubmenu!.querySelector('[href="/holdings/new"]')).toBeInTheDocument();
    });

    expect(addSubmenu!.querySelector('[href="/holdings/new"]')).toHaveTextContent('Bond');
    expect(addSubmenu!.querySelector('[href="/holdings/brazilian-fixed-income/new"]')).toHaveTextContent(
      'Brazilian Fixed Income'
    );
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

  it('includes Currency Quotes in configurations submenu', async () => {
    mockMatchMedia(false);
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <TopNav />
      </MemoryRouter>
    );

    const configurationsItem = screen.getByRole('button', { name: 'Configurations' }).closest('li');
    expect(configurationsItem).not.toBeNull();

    await user.hover(configurationsItem!);

    const configurationsSubmenu = document.getElementById('configurations-submenu');
    expect(configurationsSubmenu).not.toBeNull();
    expect(configurationsSubmenu!.querySelector('[href="/currencies/quotes"]')).toHaveTextContent(
      'Currency Quotes'
    );
  });

  it('includes Tools nav link to /tools', () => {
    mockMatchMedia(false);

    render(
      <MemoryRouter>
        <TopNav />
      </MemoryRouter>
    );

    expect(screen.getByRole('link', { name: 'Tools' })).toHaveAttribute('href', '/tools');
  });

  it('closes holdings submenu after pointer leaves on wide viewports', async () => {
    mockMatchMedia(false);
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <TopNav />
      </MemoryRouter>
    );

    const holdingsItem = screen.getByRole('button', { name: 'Holdings' }).closest('li');
    expect(holdingsItem).not.toBeNull();

    await user.hover(holdingsItem!);
    expect(holdingsItem).toHaveClass('cb-top-nav__item--open');

    await user.unhover(holdingsItem!);
    expect(holdingsItem).not.toHaveClass('cb-top-nav__item--open');
  });

  it('renders holdings submenu from API with Bond and BRFI links', async () => {
    mockMatchMedia(false);
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <TopNav />
      </MemoryRouter>
    );

    const holdingsItem = screen.getByRole('button', { name: 'Holdings' }).closest('li');
    expect(holdingsItem).not.toBeNull();

    await user.hover(holdingsItem!);

    const holdingsSubmenu = document.getElementById('holdings-submenu');
    expect(holdingsSubmenu).not.toBeNull();

    await waitFor(() => {
      expect(holdingsSubmenu!.querySelector('[href="/holdings"]')).toBeInTheDocument();
    });

    expect(holdingsSubmenu!.querySelector('[href="/holdings"]')).toHaveTextContent('Bond');
    expect(holdingsSubmenu!.querySelector('[href="/holdings/brazilian-fixed-income"]')).toHaveTextContent(
      'Brazilian Fixed Income'
    );
    expect(screen.queryByText('Coming in v2')).not.toBeInTheDocument();
  });
});
