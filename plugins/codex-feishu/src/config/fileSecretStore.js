import fs from 'node:fs/promises';

import {
  resolveConfigHome,
  secretFilePath,
} from './paths.js';

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

export async function readFileSecret({
  settings = {},
  env = process.env,
  readFile = fs.readFile,
} = {}) {
  const configHome = resolveConfigHome({ settings, env });
  const stored = await readJsonFile(secretFilePath(configHome), readFile);

  if (typeof stored?.appSecret === 'string' && stored.appSecret.trim() !== '') {
    return stored.appSecret;
  }

  return null;
}

export async function writeFileSecret(
  appSecret,
  {
    settings = {},
    env = process.env,
    mkdir = fs.mkdir,
    writeFile = fs.writeFile,
  } = {},
) {
  const configHome = resolveConfigHome({ settings, env });
  const filePath = secretFilePath(configHome);

  await mkdir(configHome, { recursive: true });
  await writeFile(filePath, `${JSON.stringify({ appSecret }, null, 2)}\n`, {
    mode: 0o600,
  });
}
