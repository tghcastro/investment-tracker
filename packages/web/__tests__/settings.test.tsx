import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import Settings from '../src/pages/Settings';
import type { ApiSystemInfo } from '../src/types/api';
import { formatDateTime } from '../src/utils/format';

const mockUseApi = vi.fn();

vi.mock('../src/hooks/useApi', () => ({
  useApi: (url: string) => mockUseApi(url),
}));

const sampleInfo: ApiSystemInfo = {
  version: '1.2.3',
  databasePath: '/data/investment-tracker.db',
  lastBackupAt: '2025-05-28T14:30:00.000Z',
};

function mockSystemInfo(info: ApiSystemInfo = sampleInfo, loading = false) {
  mockUseApi.mockImplementation((url: string) => {
    if (url.startsWith('/api/system/info')) {
      return { data: info, loading, error: undefined };
    }
    return { data: undefined, loading: false, error: undefined };
  });
}

async function blobResponse(
  body: BlobPart,
  headers?: Record<string, string>
): Promise<Response> {
  const data = body instanceof Blob ? await body.arrayBuffer() : body;
  return new Response(data, {
    status: 200,
    headers: headers ?? {},
  });
}

describe('Settings', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('renders system info (version, database path, last backup formatted)', () => {
    mockSystemInfo();

    render(<Settings />);

    expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument();
    expect(screen.getByLabelText('System information')).toBeInTheDocument();
    expect(screen.getByText('1.2.3')).toBeInTheDocument();
    expect(screen.getByText('/data/investment-tracker.db')).toBeInTheDocument();
    expect(screen.getByText(formatDateTime(sampleInfo.lastBackupAt!))).toBeInTheDocument();
  });

  it('shows Never when lastBackupAt is null', () => {
    mockSystemInfo({ ...sampleInfo, lastBackupAt: null });

    render(<Settings />);

    expect(screen.getByText('Never')).toBeInTheDocument();
  });

  it('download backup triggers fetch to /api/system/backup and creates blob download', async () => {
    const user = userEvent.setup();
    mockSystemInfo();

    const blob = new Blob(['sqlite-backup'], { type: 'application/octet-stream' });
    vi.mocked(fetch).mockResolvedValueOnce(
      await blobResponse(blob, {
        'Content-Disposition': 'attachment; filename="my-backup.db"',
      })
    );

    const createObjectURL = vi.fn(() => 'blob:mock-url');
    const revokeObjectURL = vi.fn();
    Object.assign(URL, { createObjectURL, revokeObjectURL });

    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    render(<Settings />);

    await user.click(screen.getByRole('button', { name: 'Download backup' }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(`${import.meta.env.VITE_API_URL ?? ''}/api/system/backup`);
    });

    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(createObjectURL.mock.calls[0]![0]).toHaveProperty('size');
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');

    await waitFor(() => {
      expect(mockUseApi).toHaveBeenCalledWith('/api/system/info?r=1');
    });
  });

  it('restore: file picker → ConfirmDialog → FormData POST to /api/system/restore', async () => {
    const user = userEvent.setup();
    mockSystemInfo();

    const restoreFile = new File(['sqlite-backup'], 'restore.db', {
      type: 'application/octet-stream',
    });

    vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 200 }));

    const locationAssign = vi.fn();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { href: '', assign: locationAssign },
    });

    render(<Settings />);

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(fileInput, restoreFile);

    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Restore from backup?' })).toBeInTheDocument();
    expect(
      screen.getByText(/This replaces the current database with the selected backup file/)
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Restore' }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        `${import.meta.env.VITE_API_URL ?? ''}/api/system/restore`,
        expect.objectContaining({ method: 'POST' })
      );
    });

    const restoreCall = vi.mocked(fetch).mock.calls[0]!;
    const formData = restoreCall[1]!.body as FormData;
    expect(formData.get('file')).toBe(restoreFile);

    await waitFor(() => {
      expect(window.location.href).toBe('/');
    });
  });

  it('ConfirmDialog cancel closes restore without POST', async () => {
    const user = userEvent.setup();
    mockSystemInfo();

    const restoreFile = new File(['sqlite-backup'], 'restore.db', {
      type: 'application/octet-stream',
    });

    render(<Settings />);

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(fileInput, restoreFile);

    expect(screen.getByRole('alertdialog')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('restore 400 shows descriptive validation message', async () => {
    const user = userEvent.setup();
    mockSystemInfo();

    const restoreFile = new File(['not-sqlite'], 'bad.db', {
      type: 'application/octet-stream',
    });

    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          code: 'VALIDATION_ERROR',
          message: 'Invalid backup file',
          fields: { file: ['File is not a valid SQLite database'] },
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    );

    render(<Settings />);

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(fileInput, restoreFile);
    await user.click(screen.getByRole('button', { name: 'Restore' }));

    await waitFor(() => {
      expect(
        screen.getByText('Invalid backup file: File is not a valid SQLite database')
      ).toBeInTheDocument();
    });

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('restore 413 shows payload too large message', async () => {
    const user = userEvent.setup();
    mockSystemInfo();

    const restoreFile = new File(['x'.repeat(1024)], 'huge.db', {
      type: 'application/octet-stream',
    });

    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          code: 'PAYLOAD_TOO_LARGE',
          message: 'Uploaded backup file is too large',
        }),
        { status: 413, headers: { 'Content-Type': 'application/json' } }
      )
    );

    render(<Settings />);

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(fileInput, restoreFile);
    await user.click(screen.getByRole('button', { name: 'Restore' }));

    await waitFor(() => {
      expect(screen.getByText('Uploaded backup file is too large')).toBeInTheDocument();
    });

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });
});
