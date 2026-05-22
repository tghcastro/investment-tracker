import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TopNav } from '../src/components/ui/TopNav';

const MOBILE_QUERY = '(max-width: 767px)';

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

describe('TopNav responsive behavior', () => {
  beforeEach(() => {
    mockMatchMedia(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('keeps mobile nav closed until the hamburger toggle is clicked', () => {
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
    expect(screen.getByRole('link', { name: 'Holdings' })).toBeInTheDocument();
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

  it('does not require a menu toggle interaction on wide viewports', () => {
    mockMatchMedia(false);

    render(
      <MemoryRouter>
        <TopNav />
      </MemoryRouter>
    );

    const mainNav = screen.getByRole('navigation', { name: 'Main' });

    expect(window.matchMedia(MOBILE_QUERY).matches).toBe(false);
    expect(mainNav).not.toHaveClass('cb-top-nav__center--open');
    expect(screen.getByRole('link', { name: 'Accounts' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Close menu' })).not.toBeInTheDocument();
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
});
