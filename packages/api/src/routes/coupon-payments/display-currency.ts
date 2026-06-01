export function validateDisplayCurrencyQuery(displayCurrency: string | undefined):
  | { displayCurrency?: string }
  | { status: 400; body: Record<string, unknown> } {
  if (displayCurrency !== undefined && !/^[A-Z]{3}$/.test(displayCurrency)) {
    return {
      status: 400,
      body: {
        code: 'VALIDATION_ERROR',
        message: 'displayCurrency must be a 3-letter ISO code',
        fields: { displayCurrency: ['Must be a 3-letter ISO code'] },
      },
    };
  }

  return { displayCurrency };
}
