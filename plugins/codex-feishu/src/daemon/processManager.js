import fs from 'node:fs';
import fsPromises from 'node:fs/promises';
import path from 'node:path';
import { spawn as spawnDefault } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { loadConfig } from '../config/loadConfig.js';
import {
  daemonLogFilePath,
  daemonPidFilePath,
  resolveConfigHome,
} from '../config/paths.js';

const pluginRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..',
);

function defaultIsProcessRunning(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

async function readPidRecord(pidFilePath, readFile) {
  try {
    const raw = await readFile(pidFilePath, 'utf8');
    const parsed = JSON.parse(raw);
    if (typeof parsed?.pid !== 'number') {
      return null;
    }

    return {
      pid: parsed.pid,
      startedAt:
        typeof parsed.startedAt === 'string' ? parsed.startedAt : null,
    };
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

function createStoppedStatus({ pidFilePath, logPath, startedAt = null }) {
  return {
    running: false,
    pid: null,
    startedAt,
    pidFilePath,
    logPath,
  };
}

export async function readDaemonStatus({
  settings = {},
  env = process.env,
  isProcessRunning = defaultIsProcessRunning,
  readFile = fsPromises.readFile,
  unlink = fsPromises.unlink,
} = {}) {
  const configHome = resolveConfigHome({ settings, env });
  const pidFilePath = daemonPidFilePath(configHome);
  const logPath = daemonLogFilePath(configHome);
  const record = await readPidRecord(pidFilePath, readFile);

  if (!record) {
    return createStoppedStatus({ pidFilePath, logPath });
  }

  if (!isProcessRunning(record.pid)) {
    await unlink(pidFilePath).catch(() => {});
    return createStoppedStatus({
      pidFilePath,
      logPath,
      startedAt: record.startedAt,
    });
  }

  return {
    running: true,
    pid: record.pid,
    startedAt: record.startedAt,
    pidFilePath,
    logPath,
  };
}

export async function startDaemon({
  settings = {},
  env = process.env,
  spawnChild = spawnDefault,
  isProcessRunning = defaultIsProcessRunning,
  processExecPath = process.execPath,
  mkdir = fsPromises.mkdir,
  writeFile = fsPromises.writeFile,
  now = () => new Date(),
} = {}) {
  const config = await loadConfig({ settings, env });
  const configHome = config.configHome;
  const pidFilePath = daemonPidFilePath(configHome);
  const logPath = daemonLogFilePath(configHome);

  await mkdir(configHome, { recursive: true });

  const currentStatus = await readDaemonStatus({
    settings: {
      ...settings,
      configHome,
    },
    env,
    isProcessRunning,
  });

  if (currentStatus.running) {
    return {
      alreadyRunning: true,
      status: currentStatus,
      config,
    };
  }

  const logFd = fs.openSync(logPath, 'a');
  const child = spawnChild(
    processExecPath,
    [path.join(pluginRoot, 'src/daemon/main.js')],
    {
      cwd: pluginRoot,
      env: {
        ...process.env,
        ...env,
        CODEX_FEISHU_HOME: configHome,
      },
      detached: true,
      stdio: ['ignore', logFd, logFd],
    },
  );
  fs.closeSync(logFd);
  if (typeof child.unref === 'function') {
    child.unref();
  }

  const startedAt = now().toISOString();
  await writeFile(
    pidFilePath,
    `${JSON.stringify({ pid: child.pid, startedAt }, null, 2)}\n`,
    { mode: 0o600 },
  );

  return {
    alreadyRunning: false,
    config,
    status: {
      running: true,
      pid: child.pid,
      startedAt,
      pidFilePath,
      logPath,
    },
  };
}

export async function stopDaemon({
  settings = {},
  env = process.env,
  killProcess = process.kill,
  readFile = fsPromises.readFile,
  unlink = fsPromises.unlink,
} = {}) {
  const configHome = resolveConfigHome({ settings, env });
  const pidFilePath = daemonPidFilePath(configHome);
  const logPath = daemonLogFilePath(configHome);
  const record = await readPidRecord(pidFilePath, readFile);

  if (!record) {
    return {
      stopped: false,
      reason: 'not_running',
      status: createStoppedStatus({ pidFilePath, logPath }),
    };
  }

  try {
    killProcess(record.pid, 'SIGTERM');
  } catch (error) {
    if (error?.code !== 'ESRCH') {
      throw error;
    }
  }

  await unlink(pidFilePath).catch(() => {});

  return {
    stopped: true,
    status: createStoppedStatus({
      pidFilePath,
      logPath,
      startedAt: record.startedAt,
    }),
  };
}
