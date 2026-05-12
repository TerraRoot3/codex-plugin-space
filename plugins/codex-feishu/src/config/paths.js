import os from 'node:os';
import path from 'node:path';

export function firstNonEmpty(...values) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim() !== '') {
      return value;
    }
  }

  return undefined;
}

export function resolveConfigHome({ settings = {}, env = process.env } = {}) {
  return firstNonEmpty(
    settings.configHome,
    settings.configDir,
    env.CODEX_FEISHU_HOME,
    path.join(os.homedir(), '.codex-feishu'),
  );
}

export function resolveDataDir({
  settings = {},
  storedConfig = {},
  env = process.env,
} = {}) {
  return firstNonEmpty(
    settings.dataDir,
    storedConfig.dataDir,
    env.CODEX_FEISHU_DATA_DIR,
    resolveConfigHome({ settings, env }),
  );
}

export function configFilePath(configHome) {
  return path.join(configHome, 'config.json');
}

export function secretFilePath(configHome) {
  return path.join(configHome, 'secret.json');
}

export function daemonPidFilePath(configHome) {
  return path.join(configHome, 'daemon.pid');
}

export function daemonLogFilePath(configHome) {
  return path.join(configHome, 'daemon.log');
}
