import { readFileSecret } from './fileSecretStore.js';
import { readKeychainSecret } from './keychain.js';

export class ConfigError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ConfigError';
  }
}

function firstNonEmpty(...values) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim() !== '') {
      return value;
    }
  }
  return undefined;
}

export async function loadConfig({ settings = {}, env = process.env } = {}) {
  const keychainSecret = await readKeychainSecret(settings);
  const fileSecret = await readFileSecret(settings);

  const appId = firstNonEmpty(settings.appId, env.FEISHU_APP_ID);
  const appSecret = firstNonEmpty(
    settings.appSecret,
    keychainSecret,
    fileSecret,
    env.FEISHU_APP_SECRET,
  );
  const mode = firstNonEmpty(
    settings.mode,
    env.CODEX_FEISHU_MODE,
    'background',
  );
  const dataDir = firstNonEmpty(
    settings.dataDir,
    env.CODEX_FEISHU_DATA_DIR,
    '.codex-feishu-data',
  );

  if (!appId || !appSecret) {
    throw new ConfigError('FEISHU_APP_ID and FEISHU_APP_SECRET are required');
  }

  return {
    appId,
    appSecret,
    mode,
    dataDir,
  };
}
