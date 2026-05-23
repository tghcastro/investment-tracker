import type { FastifyInstance } from 'fastify';

import type { Repo } from '../../repo.js';

const DEFAULT_LIMIT = 5;
const MAX_LIMIT = 50;

function parseLimit(value: string | undefined): number | { message: string } {
  const raw = value ?? String(DEFAULT_LIMIT);
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isInteger(parsed) || parsed <= 0 || String(parsed) !== raw) {
    return { message: 'limit must be a positive integer' };
  }
  if (parsed > MAX_LIMIT) {
    return { message: `limit must be at most ${MAX_LIMIT}` };
  }
  return parsed;
}

export function registerPortfolioUpcomingCoupons(app: FastifyInstance, repo: Repo): void {
  app.get('/api/portfolio/upcoming-coupons', async (request, reply) => {
    const { limit: limitParam } = request.query as { limit?: string };
    const parsed = parseLimit(limitParam);
    if (typeof parsed !== 'number') {
      return reply.status(400).send({
        code: 'VALIDATION_ERROR',
        message: parsed.message,
        fields: { limit: [parsed.message] },
      });
    }

    const upcoming = await repo.getUpcomingCoupons(parsed);
    return reply.status(200).send(upcoming);
  });
}
