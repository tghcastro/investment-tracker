import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { TopNav } from '../src/components/ui/TopNav';

describe('TopNav responsive behavior', () => {
  it('shows hamburger menu toggle for narrow viewports', () => {
    render(
      <MemoryRouter>
        <TopNav />
      </MemoryRouter>
    );

    const menuToggle = screen.getByRole('button', { name: 'Open menu' });
    expect(menuToggle).toBeInTheDocument();
    expect(menuToggle).toHaveClass('cb-top-nav__menu-toggle');
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
  });
});
