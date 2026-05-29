import type { FastifyInstance } from 'fastify';

import type { Repo } from '../../repo.js';
import { toApiBondHoldings } from './serialize.js';

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function parseMaturityAfter(value: string): Date | { message: string } {
  if (!ISO_DATE_RE.test(value)) {
    return { message: 'Invalid maturityAfter date format. Expected YYYY-MM-DD.' };
  }

  const [year, month, day] = value.split('-').map((part) => Number.parseInt(part, 10));
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() + 1 !== month ||
    date.getUTCDate() !== day
  ) {
    return { message: 'Invalid maturityAfter date format. Expected YYYY-MM-DD.' };
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

export function registerListHoldings(app: FastifyInstance, getRepo: () => Repo): void {
  app.get('/api/holdings', async (request, reply) => {
    const repo = getRepo();
    const { maturityAfter, accountId, holdingTypeId } = request.query as {
      maturityAfter?: string;
      accountId?: string;
      holdingTypeId?: string;
    };

    let parsedMaturityAfter: Date | undefined;
    if (maturityAfter !== undefined) {
      const parsed = parseMaturityAfter(maturityAfter);
      if ('message' in parsed) {
        return reply.status(400).send({ message: parsed.message });
      }
      parsedMaturityAfter = parsed;
    }

    let parsedAccountId: string | undefined;
    if (accountId !== undefined) {
      const parsed = parsePositiveIntegerId(accountId, 'Account ID');
      if ('message' in parsed) {
        return reply.status(400).send({
          code: 'VALIDATION_ERROR',
          message: parsed.message,
          fields: { accountId: [parsed.message] },
        });
      }
      parsedAccountId = parsed.id;
    }

    let parsedHoldingTypeId: string | undefined;
    if (holdingTypeId !== undefined) {
      const parsed = parsePositiveIntegerId(holdingTypeId, 'Holding type ID');
      if ('message' in parsed) {
        return reply.status(400).send({
          code: 'VALIDATION_ERROR',
          message: parsed.message,
          fields: { holdingTypeId: [parsed.message] },
        });
      }
      parsedHoldingTypeId = parsed.id;
    }

    const holdings = await repo.listBondHoldingsFiltered({
      accountId: parsedAccountId,
      maturityAfter: parsedMaturityAfter,
      holdingTypeId: parsedHoldingTypeId,
    });
    return reply.status(200).send(toApiBondHoldings(holdings));
  });
}
