import { useRef, useState, type ChangeEvent } from 'react';
import { ConfirmDialog } from '../components/forms';
import { Button, ErrorBanner, PageHeader } from '../components/ui';
import { useApi } from '../hooks';
import type { ApiSystemInfo } from '../types/api';
import './Home.css';
import './Settings.css';

const API_BASE = import.meta.env.VITE_API_URL ?? '';
const DEFAULT_BACKUP_FILENAME = 'investment-tracker-backup.db';

function parseBackupFilename(contentDisposition: string | null): string {
  if (!contentDisposition) {
    return DEFAULT_BACKUP_FILENAME;
  }

  const quoted = /filename="([^"]+)"/i.exec(contentDisposition);
  if (quoted?.[1]) {
    return quoted[1];
  }

  const encoded = /filename\*=UTF-8''([^;\s]+)/i.exec(contentDisposition);
  if (encoded?.[1]) {
    try {
      return decodeURIComponent(encoded[1]);
    } catch {
      return encoded[1];
    }
  }

  const unquoted = /filename=([^;\s]+)/i.exec(contentDisposition);
  if (unquoted?.[1]) {
    return unquoted[1].replace(/"/g, '');
  }

  return DEFAULT_BACKUP_FILENAME;
}

export default function Settings() {
  const [infoRefreshKey, setInfoRefreshKey] = useState(0);
  const { data: info, loading, error } = useApi<ApiSystemInfo>(
    `/api/system/info?r=${infoRefreshKey}`
  );

  const [actionError, setActionError] = useState<string | undefined>(undefined);
  const [downloading, setDownloading] = useState(false);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [restoreConfirmOpen, setRestoreConfirmOpen] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const busy = downloading || restoring;
  const bannerMessage = error ?? actionError;

  async function handleDownloadBackup() {
    setActionError(undefined);
    setDownloading(true);

    try {
      const response = await fetch(`${API_BASE}/api/system/backup`);
      if (!response.ok) {
        throw new Error(`Request failed (${response.status})`);
      }

      const blob = await response.blob();
      const filename = parseBackupFilename(response.headers.get('Content-Disposition'));
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = filename;
      anchor.style.display = 'none';
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(objectUrl);

      setInfoRefreshKey((key) => key + 1);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Download failed');
    } finally {
      setDownloading(false);
    }
  }

  function handleRestoreButtonClick() {
    setActionError(undefined);
    fileInputRef.current?.click();
  }

  function handleFileSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    setRestoreFile(file);
    setRestoreConfirmOpen(true);
  }

  function handleRestoreCancel() {
    if (restoring) {
      return;
    }

    setRestoreConfirmOpen(false);
    setRestoreFile(null);
  }

  async function handleRestoreConfirm() {
    if (!restoreFile) {
      return;
    }

    setActionError(undefined);
    setRestoring(true);

    try {
      const formData = new FormData();
      formData.append('file', restoreFile);

      const response = await fetch(`${API_BASE}/api/system/restore`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Request failed (${response.status})`);
      }

      window.location.href = '/';
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Restore failed');
      setRestoring(false);
      setRestoreConfirmOpen(false);
      setRestoreFile(null);
    }
  }

  return (
    <div className="cb-settings">
      <PageHeader
        title="Settings"
        subtitle="System information and data backup"
      />

      {bannerMessage ? <ErrorBanner message={bannerMessage} /> : null}

      <section className="cb-settings__section" aria-label="System information">
        <h2 className="cb-settings__section-title">System information</h2>

        {loading ? (
          <div className="cb-settings__metrics cb-settings__metrics--loading" aria-busy="true">
            <div className="cb-home__metric-card cb-home__metric-card--skeleton" />
            <div className="cb-home__metric-card cb-home__metric-card--skeleton" />
            <div className="cb-home__metric-card cb-home__metric-card--skeleton" />
          </div>
        ) : null}

        {!loading && info ? (
          <div className="cb-settings__metrics">
            <div className="cb-home__metric-card">
              <p className="cb-home__metric-label">App version</p>
              <p className="cb-home__metric-value">{info.version}</p>
            </div>
            <div className="cb-home__metric-card">
              <p className="cb-home__metric-label">Database path</p>
              <p className="cb-home__metric-value cb-settings__metric-value--path">
                {info.databasePath}
              </p>
            </div>
            <div className="cb-home__metric-card">
              <p className="cb-home__metric-label">Last backup</p>
              <p className="cb-home__metric-value">
                {info.lastBackupAt ?? 'Never'}
              </p>
            </div>
          </div>
        ) : null}
      </section>

      <section className="cb-settings__section" aria-label="Backup & restore">
        <h2 className="cb-settings__section-title">Backup & restore</h2>
        <div className="cb-settings__actions">
          <Button variant="primary" onClick={handleDownloadBackup} disabled={busy}>
            {downloading ? 'Downloading…' : 'Download backup'}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".db,application/octet-stream"
            className="cb-settings__file-input"
            onChange={handleFileSelected}
          />
          <Button variant="secondary-light" onClick={handleRestoreButtonClick} disabled={busy}>
            Restore from backup
          </Button>
        </div>
      </section>

      <ConfirmDialog
        open={restoreConfirmOpen}
        title="Restore from backup?"
        message="This replaces the current database with the selected backup file. All current data will be overwritten."
        confirmLabel="Restore"
        loading={restoring}
        onConfirm={handleRestoreConfirm}
        onCancel={handleRestoreCancel}
      />
    </div>
  );
}
