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

function parseAccountId(value: string): { accountId: string } | { message: string } {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0 || String(parsed) !== value) {
    return { message: 'Account ID must be a positive integer' };
  }
  return { accountId: value };
}

export function registerListHoldings(app: FastifyInstance, repo: Repo): void {
  app.get('/api/holdings', async (request, reply) => {
    const { maturityAfter, accountId } = request.query as {
      maturityAfter?: string;
      accountId?: string;
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
      const parsed = parseAccountId(accountId);
      if ('message' in parsed) {
        return reply.status(400).send({
          code: 'VALIDATION_ERROR',
          message: parsed.message,
          fields: { accountId: [parsed.message] },
        });
      }
      parsedAccountId = parsed.accountId;
    }

    const holdings = await repo.listBondHoldingsFiltered({
      accountId: parsedAccountId,
      maturityAfter: parsedMaturityAfter,
    });
    return reply.status(200).send(toApiBondHoldings(holdings));
  });
}
