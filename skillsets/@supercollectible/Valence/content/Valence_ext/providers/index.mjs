// providers/index.mjs — Provider registry
import * as openaiCompat from './openai-compat.mjs';

const providers = {
  'openai-compat': openaiCompat,
};

export function getProvider(type) {
  const provider = providers[type];
  if (!provider) throw new Error(`Unknown provider type: ${type}`);
  return provider;
}
