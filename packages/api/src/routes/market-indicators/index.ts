import type { FastifyInstance } from 'fastify';

import type { Repo } from '../../repo.js';
import { registerDeleteMarketIndicator } from './delete.js';
import { registerGetMarketIndicatorById } from './get-by-id.js';
import { registerGetLatestMarketIndicatorValue } from './latest.js';
import { registerListMarketIndicators } from './list.js';
import { registerPatchMarketIndicator } from './patch.js';
import { registerPostMarketIndicator } from './post.js';
import { registerDeleteIndicatorValue } from './values/delete.js';
import { registerListIndicatorValues } from './values/list.js';
import { registerPatchIndicatorValue } from './values/patch.js';
import { registerPostIndicatorValue } from './values/post.js';

export function registerMarketIndicatorsRoutes(app: FastifyInstance, getRepo: () => Repo): void {
  registerListMarketIndicators(app, getRepo);
  registerGetMarketIndicatorById(app, getRepo);
  registerPostMarketIndicator(app, getRepo);
  registerPatchMarketIndicator(app, getRepo);
  registerDeleteMarketIndicator(app, getRepo);
  registerGetLatestMarketIndicatorValue(app, getRepo);
  registerListIndicatorValues(app, getRepo);
  registerPostIndicatorValue(app, getRepo);
  registerPatchIndicatorValue(app, getRepo);
  registerDeleteIndicatorValue(app, getRepo);
}
