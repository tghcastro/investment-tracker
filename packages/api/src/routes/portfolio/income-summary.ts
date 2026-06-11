import type { FastifyInstance } from 'fastify';

import type { Repo } from '../../repo.js';
import { validateDisplayCurrencyQuery } from '../coupon-payments/display-currency.js';

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function parseIsoDate(value: string): Date | { message: string } {
  if (!ISO_DATE_RE.test(value)) {
    return { message: 'Invalid date format. Expected YYYY-MM-DD.' };
  }

  const [year, month, day] = value.split('-').map((part) => Number.parseInt(part, 10));
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() + 1 !== month ||
    date.getUTCDate() !== day
  ) {
    return { message: 'Invalid date format. Expected YYYY-MM-DD.' };
  }

  return date;
}

function currentUtcCalendarYearRange(): { from: Date; to: Date } {
  const now = new Date();
  const year = now.getUTCFullYear();
  return {
    from: new Date(Date.UTC(year, 0, 1)),
    to: new Date(Date.UTC(year, 11, 31)),
  };
}

export function registerPortfolioIncomeSummary(app: FastifyInstance, getRepo: () => Repo): void {
  app.get('/api/portfolio/income-summary', async (request, reply) => {
    const repo = getRepo();
    const { from: fromParam, to: toParam, displayCurrency } = request.query as {
      from?: string;
      to?: string;
      displayCurrency?: string;
    };

    const displayCurrencyResult = validateDisplayCurrencyQuery(displayCurrency);
    if ('status' in displayCurrencyResult) {
      return reply.status(displayCurrencyResult.status).send(displayCurrencyResult.body);
    }

    const defaults = currentUtcCalendarYearRange();
    let from = defaults.from;
    let to = defaults.to;

    if (fromParam !== undefined) {
      const parsed = parseIsoDate(fromParam);
      if ('message' in parsed) {
        return reply.status(400).send({
          code: 'VALIDATION_ERROR',
          message: parsed.message,
          fields: { from: [parsed.message] },
        });
      }
      from = parsed;
    }

    if (toParam !== undefined) {
      const parsed = parseIsoDate(toParam);
      if ('message' in parsed) {
        return reply.status(400).send({
          code: 'VALIDATION_ERROR',
          message: parsed.message,
          fields: { to: [parsed.message] },
        });
      }
      to = parsed;
    }

    if (from.getTime() > to.getTime()) {
      return reply.status(400).send({
        code: 'VALIDATION_ERROR',
        message: 'from must be on or before to',
        fields: { from: ['from must be on or before to'] },
      });
    }

    const summary = await repo.getIncomeSummary(from, to, {
      displayCurrency: displayCurrencyResult.displayCurrency,
    });
    return reply.status(200).send(summary);
  });
}
