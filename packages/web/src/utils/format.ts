/** faceValue from API is in cents */
export function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);
}

/** List responses use decimal (0.0425); POST/GET-by-id use percent (4.25) */
export function formatCouponRate(rate: number): string {
  const percent = rate <= 1 ? rate * 100 : rate;
  return `${percent.toFixed(2)}%`;
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(iso));
}

export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(iso));
}

export function issuerInitials(issuer: string): string {
  const words = issuer.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return (words[0]![0]! + words[1]![0]!).toUpperCase();
  }
  return issuer.slice(0, 2).toUpperCase();
}
