import { readStoredConfig } from './configStore.js';
import { readFileSecret } from './fileSecretStore.js';
import { readKeychainSecret } from './keychain.js';
import {
  firstNonEmpty,
  resolveConfigHome,
  resolveDataDir,
} from './paths.js';

export class ConfigError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ConfigError';
  }
}

export async function loadConfig({ settings = {}, env = process.env } = {}) {
  const storedConfig = await readStoredConfig({ settings, env });
  const keychainSecret = await readKeychainSecret(settings);
  const fileSecret = await readFileSecret({ settings, env });
  const configHome = resolveConfigHome({ settings, env });

  const appId = firstNonEmpty(
    settings.appId,
    storedConfig.appId,
    env.FEISHU_APP_ID,
  );
  const appSecret = firstNonEmpty(
    settings.appSecret,
    keychainSecret,
    fileSecret,
    env.FEISHU_APP_SECRET,
  );
  const mode = firstNonEmpty(
    settings.mode,
    storedConfig.mode,
    env.CODEX_FEISHU_MODE,
    'background',
  );
  const dataDir = resolveDataDir({ settings, storedConfig, env });

  if (!appId || !appSecret) {
    throw new ConfigError('FEISHU_APP_ID and FEISHU_APP_SECRET are required');
  }

  return {
    appId,
    appSecret,
    mode,
    dataDir,
    configHome,
  };
}
