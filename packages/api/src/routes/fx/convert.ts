import type { FastifyInstance } from 'fastify';

import type { Repo } from '../../repo.js';

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function registerFxConvert(app: FastifyInstance, getRepo: () => Repo): void {
  app.get('/api/fx/convert', async (request, reply) => {
    const repo = getRepo();
    const { amountCents, currencyCode, purchaseDate, convertedCurrency } = request.query as {
      amountCents?: string;
      currencyCode?: string;
      purchaseDate?: string;
      convertedCurrency?: string;
    };

    const fields: Record<string, string[]> = {};

    const parsedAmount = amountCents !== undefined ? Number.parseInt(amountCents, 10) : Number.NaN;
    if (!Number.isInteger(parsedAmount) || parsedAmount <= 0) {
      fields.amountCents = ['Must be a positive integer'];
    }

    if (!currencyCode || !/^[A-Z]{3}$/.test(currencyCode)) {
      fields.currencyCode = ['Must be a 3-letter ISO code'];
    }

    if (!purchaseDate || !ISO_DATE_RE.test(purchaseDate)) {
      fields.purchaseDate = ['Must be YYYY-MM-DD'];
    }

    if (convertedCurrency !== undefined && !/^[A-Z]{3}$/.test(convertedCurrency)) {
      fields.convertedCurrency = ['Must be a 3-letter ISO code'];
    }

    if (Object.keys(fields).length > 0) {
      return reply.status(400).send({
        code: 'VALIDATION_ERROR',
        message: 'Invalid FX convert query',
        fields,
      });
    }

    const result = await repo.previewFxConversion({
      amountCents: parsedAmount,
      currencyCode: currencyCode!,
      purchaseDate: purchaseDate!,
      convertedCurrency,
    });

    return reply.status(200).send(result);
  });
}
