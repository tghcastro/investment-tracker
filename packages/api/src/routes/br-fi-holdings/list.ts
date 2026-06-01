import type { FastifyInstance } from 'fastify';

import type { Repo } from '../../repo.js';
import { toApiBrFiHoldings } from './serialize.js';

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

export function registerListBrFiHoldings(app: FastifyInstance, getRepo: () => Repo): void {
  app.get('/api/br-fi-holdings', async (request, reply) => {
    const repo = getRepo();
    const { accountId } = request.query as { accountId?: string };

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

    const holdings = await repo.listBrFiHoldingsFiltered({
      accountId: parsedAccountId,
    });
    return reply.status(200).send(toApiBrFiHoldings(holdings));
  });
}
