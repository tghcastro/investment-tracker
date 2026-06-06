import type { FastifyInstance } from 'fastify';
import { HOLDING_TYPE_SLUGS } from 'bonds-domain';

import type { DashboardFilters, Repo } from '../../repo.js';
import { RepoError } from '../../repo.js';

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

function parsePositiveIntegerId(
  value: string,
  label: string
): { id: string } | { message: string } {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0 || String(parsed) !== value) {
    return { message: `${label} must be a positive integer` };
  }
  return { id: value };
}

function parseLimit(value: string | undefined): number | { message: string } {
  const raw = value ?? '20';
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isInteger(parsed) || parsed <= 0 || String(parsed) !== raw) {
    return { message: 'limit must be a positive integer' };
  }
  if (parsed > 100) {
    return { message: 'limit must be at most 100' };
  }
  return parsed;
}

export function registerDashboardRoute(app: FastifyInstance, getRepo: () => Repo): void {
  app.get('/api/dashboard', async (request, reply) => {
    const repo = getRepo();
    const {
      displayCurrency,
      accountId,
      holdingTypeSlug,
      from: fromParam,
      to: toParam,
      limit: limitParam,
    } = request.query as {
      displayCurrency?: string;
      accountId?: string;
      holdingTypeSlug?: string;
      from?: string;
      to?: string;
      limit?: string;
    };

    if (displayCurrency !== undefined) {
      if (!/^[A-Z]{3}$/.test(displayCurrency)) {
        return reply.status(400).send({
          code: 'VALIDATION_ERROR',
          message: 'displayCurrency must be a 3-letter ISO code',
          fields: { displayCurrency: ['Must be a 3-letter ISO code'] },
        });
      }

      const currencies = await repo.listCurrencies();
      if (!currencies.some((currency) => currency.code === displayCurrency)) {
        return reply.status(400).send({
          code: 'INVALID_DISPLAY_CURRENCY',
          message: 'Unknown display currency code',
          fields: { displayCurrency: ['Unknown currency code'] },
        });
      }
    }

    const filters: DashboardFilters = { displayCurrency };

    if (accountId !== undefined) {
      const parsed = parsePositiveIntegerId(accountId, 'Account ID');
      if ('message' in parsed) {
        return reply.status(400).send({
          code: 'VALIDATION_ERROR',
          message: parsed.message,
          fields: { accountId: [parsed.message] },
        });
      }
      filters.accountId = parsed.id;
    }

    if (holdingTypeSlug !== undefined) {
      if (!HOLDING_TYPE_SLUGS.includes(holdingTypeSlug as (typeof HOLDING_TYPE_SLUGS)[number])) {
        return reply.status(400).send({
          code: 'VALIDATION_ERROR',
          message: 'Unknown holding type slug',
          fields: {
            holdingTypeSlug: ['Must be bond or brazilian-fixed-income'],
          },
        });
      }
      filters.holdingTypeSlug = holdingTypeSlug as DashboardFilters['holdingTypeSlug'];
    }

    if (fromParam !== undefined) {
      const parsed = parseIsoDate(fromParam);
      if ('message' in parsed) {
        return reply.status(400).send({
          code: 'VALIDATION_ERROR',
          message: parsed.message,
          fields: { from: [parsed.message] },
        });
      }
      filters.from = fromParam;
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
      filters.to = toParam;
    }

    if (limitParam !== undefined) {
      const parsed = parseLimit(limitParam);
      if (typeof parsed !== 'number') {
        return reply.status(400).send({
          code: 'VALIDATION_ERROR',
          message: parsed.message,
          fields: { limit: [parsed.message] },
        });
      }
      filters.limit = parsed;
    }

    try {
      const dashboard = await repo.getDashboard(filters);
      return reply.status(200).send(dashboard);
    } catch (error) {
      if (error instanceof RepoError) {
        throw error;
      }
      throw error;
    }
  });
}
