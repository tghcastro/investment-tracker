import { createBondHoldingSchema } from 'bonds-domain';
import type { BondHolding } from 'bonds-domain';
import type { FastifyInstance } from 'fastify';
import type { ZodError } from 'zod';

import { RepoError, type Repo } from '../../repo.js';

function zodToFields(error: ZodError): Record<string, string[]> {
  const fields: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.length > 0 ? issue.path.join('.') : '_root';
    fields[key] ??= [];
    fields[key].push(issue.message);
  }
  return fields;
}

function mapRepoError(error: RepoError): { statusCode: number; body: { code: string; message: string } } {
  switch (error.code) {
    case 'FOREIGN_KEY':
    case 'INVALID_ID':
      return { statusCode: 400, body: { code: error.code, message: error.message } };
    default:
      return { statusCode: 500, body: { code: 'INTERNAL_ERROR', message: 'Internal server error' } };
  }
}

/** Request/response couponRate is annual % (schema 0–100); repo stores decimal (e.g. 4.25 → 0.0425). */
function couponRatePercentToDecimal(percent: number): number {
  return percent / 100;
}

function couponRateDecimalToPercent(decimal: number): number {
  return decimal * 100;
}

function toApiBondHolding(holding: BondHolding): BondHolding {
  return {
    ...holding,
    couponRate: couponRateDecimalToPercent(holding.couponRate),
  };
}

export function registerPostHolding(app: FastifyInstance, repo: Repo): void {
  app.post('/api/holdings', async (request, reply) => {
    const parsed = createBondHoldingSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        code: 'VALIDATION_ERROR',
        fields: zodToFields(parsed.error),
      });
    }

    const { couponRate, ...rest } = parsed.data;

    try {
      const holding = await repo.insertBondHolding({
        ...rest,
        couponRate: couponRatePercentToDecimal(couponRate),
      });
      return reply.status(201).send(toApiBondHolding(holding));
    } catch (error) {
      if (error instanceof RepoError) {
        const mapped = mapRepoError(error);
        return reply.status(mapped.statusCode).send(mapped.body);
      }
      throw error;
    }
  });
}
