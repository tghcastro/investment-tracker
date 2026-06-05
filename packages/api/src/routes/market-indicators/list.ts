import type { IndicatorCategory } from 'bonds-domain';
import type { FastifyInstance } from 'fastify';

import type { Repo } from '../../repo.js';
import { toApiMarketIndicators } from './serialize.js';

const INDICATOR_CATEGORIES = new Set<IndicatorCategory>([
  'INTEREST_RATE',
  'INFLATION',
  'STOCK_INDEX',
]);

export function registerListMarketIndicators(app: FastifyInstance, getRepo: () => Repo): void {
  app.get('/api/market-indicators', async (request, reply) => {
    const repo = getRepo();
    const { category } = request.query as { category?: string };

    if (category !== undefined && !INDICATOR_CATEGORIES.has(category as IndicatorCategory)) {
      return reply.status(400).send({
        code: 'VALIDATION_ERROR',
        message: 'Invalid indicator category',
        fields: { category: ['Must be INTEREST_RATE, INFLATION, or STOCK_INDEX'] },
      });
    }

    const indicators = await repo.listMarketIndicators(
      category ? { category: category as IndicatorCategory } : undefined
    );
    return reply.status(200).send(toApiMarketIndicators(indicators));
  });
}
