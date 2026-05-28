export function getAppVersion(): string {
  return process.env.APP_VERSION?.trim() || 'dev';
}
