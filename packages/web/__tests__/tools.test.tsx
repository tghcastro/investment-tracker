import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import Tools from '../src/pages/Tools';

describe('Tools', () => {
  it('renders hub with Backup / Restore card linking to tool view', () => {
    render(
      <MemoryRouter>
        <Tools />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: 'Tools' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Backup \/ Restore/ })).toHaveAttribute(
      'href',
      '/tools/backup-restore'
    );
  });
});
