import {
  createCurrencyQuoteSchema,
  updateCurrencyQuoteSchema,
} from 'bonds-domain';
import type { FastifyInstance } from 'fastify';

import { NotFoundError } from '../../middleware/errors.js';
import type { Repo } from '../../repo.js';

export function registerListCurrencyQuotes(app: FastifyInstance, getRepo: () => Repo): void {
  app.get('/api/currency-quotes', async (request, reply) => {
    const repo = getRepo();
    const { targetCurrency, fromDate, toDate } = request.query as {
      targetCurrency?: string;
      fromDate?: string;
      toDate?: string;
    };

    const quotes = await repo.listCurrencyQuotes({
      targetCurrency,
      fromDate,
      toDate,
    });
    return reply.status(200).send(quotes);
  });
}

export function registerPostCurrencyQuote(app: FastifyInstance, getRepo: () => Repo): void {
  app.post('/api/currency-quotes', async (request, reply) => {
    const repo = getRepo();
    const parsed = createCurrencyQuoteSchema.parse(request.body);
    const quote = await repo.insertCurrencyQuote(parsed);
    return reply.status(201).send(quote);
  });
}

export function registerPatchCurrencyQuote(app: FastifyInstance, getRepo: () => Repo): void {
  app.patch('/api/currency-quotes/:id', async (request, reply) => {
    const repo = getRepo();
    const { id } = request.params as { id: string };
    const parsed = updateCurrencyQuoteSchema.parse(request.body);

    const existing = await repo.getCurrencyQuote(id);
    if (!existing) {
      throw new NotFoundError('Currency quote not found');
    }

    const quote = await repo.updateCurrencyQuote(id, parsed);
    return reply.status(200).send(quote);
  });
}

export function registerDeleteCurrencyQuote(app: FastifyInstance, getRepo: () => Repo): void {
  app.delete('/api/currency-quotes/:id', async (request, reply) => {
    const repo = getRepo();
    const { id } = request.params as { id: string };

    const deleted = await repo.deleteCurrencyQuote(id);
    if (!deleted) {
      throw new NotFoundError('Currency quote not found');
    }

    return reply.status(204).send();
  });
}
