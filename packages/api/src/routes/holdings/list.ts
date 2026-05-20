import type { FastifyInstance } from 'fastify';

import type { Repo } from '../../repo.js';

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

export function registerListHoldings(app: FastifyInstance, repo: Repo): void {
  app.get('/api/holdings', async (request, reply) => {
    const { maturityAfter } = request.query as { maturityAfter?: string };

    if (maturityAfter !== undefined) {
      const parsed = parseMaturityAfter(maturityAfter);
      if ('message' in parsed) {
        return reply.status(400).send({ message: parsed.message });
      }

      const holdings = await repo.listBondHoldingsByMaturity(parsed);
      return reply.status(200).send(holdings);
    }

    const holdings = await repo.listBondHoldings();
    return reply.status(200).send(holdings);
  });
}
