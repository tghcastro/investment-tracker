import type { FastifyInstance } from 'fastify';

import type { Repo } from '../../repo.js';

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function parseDisplayCurrencyQuery(value: string | undefined): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (!/^[A-Z]{3}$/.test(value)) {
    return value;
  }
  return value;
}

export function registerPortfolioSummary(app: FastifyInstance, getRepo: () => Repo): void {
  app.get('/api/portfolio/summary', async (request, reply) => {
    const repo = getRepo();
    const { displayCurrency, asOfDate } = request.query as {
      displayCurrency?: string;
      asOfDate?: string;
    };

    if (displayCurrency !== undefined && !/^[A-Z]{3}$/.test(displayCurrency)) {
      return reply.status(400).send({
        code: 'VALIDATION_ERROR',
        message: 'displayCurrency must be a 3-letter ISO code',
        fields: { displayCurrency: ['Must be a 3-letter ISO code'] },
      });
    }

    if (asOfDate !== undefined && !ISO_DATE_RE.test(asOfDate)) {
      return reply.status(400).send({
        code: 'VALIDATION_ERROR',
        message: 'asOfDate must be YYYY-MM-DD',
        fields: { asOfDate: ['Must be YYYY-MM-DD'] },
      });
    }

    const summary = await repo.getPortfolioSummary({
      displayCurrency: parseDisplayCurrencyQuery(displayCurrency),
      asOfDate,
    });
    return reply.status(200).send(summary);
  });
}
