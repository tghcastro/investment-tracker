export function shouldSeedFixtures(env: NodeJS.ProcessEnv = process.env): boolean {
  if (env.SEED_FIXTURES === '1') return true;
  if (env.SEED_FIXTURES === '0') return false;
  return env.NODE_ENV !== 'production';
}
