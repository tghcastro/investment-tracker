import { brFiHoldingUpdateSchema, validateIndexingParams } from 'bonds-domain';
import type { FastifyInstance } from 'fastify';

import { FieldValidationError, NotFoundError } from '../../middleware/errors.js';
import type { Repo } from '../../repo.js';
import { toApiBrFiHolding } from './serialize.js';

export function registerPatchBrFiHolding(app: FastifyInstance, getRepo: () => Repo): void {
  app.patch('/api/br-fi-holdings/:id', async (request, reply) => {
    const repo = getRepo();
    const { id } = request.params as { id: string };
    const parsed = brFiHoldingUpdateSchema.parse(request.body);

    const existing = await repo.getBrFiHolding(id);
    if (!existing) {
      throw new NotFoundError('Brazilian Fixed Income holding not found');
    }

    const mergedIndexingType = parsed.indexingType ?? existing.indexingType;
    const indexingValidation = validateIndexingParams(mergedIndexingType, {
      cdiPercentage: parsed.cdiPercentage ?? existing.cdiPercentage,
      ipcaSpreadPercent: parsed.ipcaSpreadPercent ?? existing.ipcaSpreadPercent,
      preFixedRatePercent: parsed.preFixedRatePercent ?? existing.preFixedRatePercent,
    });
    if (!indexingValidation.ok) {
      throw new FieldValidationError(indexingValidation.fields, 'Invalid indexing parameters');
    }

    const holding = await repo.updateBrFiHolding(id, parsed);
    if (!holding) {
      throw new NotFoundError('Brazilian Fixed Income holding not found');
    }
    const holdingWithConverted = await repo.getBrFiHoldingWithConverted(holding.id);
    return reply.status(200).send(toApiBrFiHolding(holdingWithConverted!));
  });
}
