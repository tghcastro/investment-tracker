export function parseDollarsToCents(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const dollars = Number.parseFloat(trimmed);
  if (!Number.isFinite(dollars) || dollars <= 0) {
    return null;
  }
  return Math.round(dollars * 100);
}

export function centsToDollarInput(cents: number): string {
  return (cents / 100).toFixed(2);
}
