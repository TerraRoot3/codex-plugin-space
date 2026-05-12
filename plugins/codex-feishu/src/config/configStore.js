import fs from 'node:fs/promises';

import {
  configFilePath,
  firstNonEmpty,
  resolveConfigHome,
} from './paths.js';

function sanitizeStoredConfig(input) {
  return {
    ...(firstNonEmpty(input?.appId) ? { appId: input.appId } : {}),
    ...(firstNonEmpty(input?.mode) ? { mode: input.mode } : {}),
    ...(firstNonEmpty(input?.dataDir) ? { dataDir: input.dataDir } : {}),
  };
}

async function readJsonFile(filePath, readFile) {
  try {
    const contents = await readFile(filePath, 'utf8');
    return JSON.parse(contents);
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

export async function readStoredConfig({
  settings = {},
  env = process.env,
  readFile = fs.readFile,
} = {}) {
  const configHome = resolveConfigHome({ settings, env });
  const stored = await readJsonFile(configFilePath(configHome), readFile);

  return sanitizeStoredConfig(stored ?? {});
}

export async function writeStoredConfig({
  config,
  settings = {},
  env = process.env,
  mkdir = fs.mkdir,
  writeFile = fs.writeFile,
} = {}) {
  const configHome = resolveConfigHome({ settings, env });
  const filePath = configFilePath(configHome);
  const sanitized = sanitizeStoredConfig(config ?? {});

  await mkdir(configHome, { recursive: true });
  await writeFile(filePath, `${JSON.stringify(sanitized, null, 2)}\n`, {
    mode: 0o600,
  });

  return sanitized;
}
