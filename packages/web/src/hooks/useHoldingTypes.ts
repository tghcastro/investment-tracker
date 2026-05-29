import { useApi } from './useApi';
import type { ApiHoldingType } from '../types/api';

export function useHoldingTypes() {
  return useApi<ApiHoldingType[]>('/api/holding-types');
}
