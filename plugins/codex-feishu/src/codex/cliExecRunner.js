import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { execFile as execFileCallback } from 'node:child_process';
import { promisify } from 'node:util';

const execFileDefault = promisify(execFileCallback);

function isPendingThreadId(threadId) {
  return typeof threadId === 'string' && threadId.startsWith('pending:');
}

function buildSharedArgs() {
  return [
    '-c',
    'model_reasoning_effort="minimal"',
    '-c',
    'service_tier="fast"',
    '--json',
    '--output-last-message',
  ];
}

function parseThreadStarted(stdout) {
  for (const line of stdout.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('{')) {
      continue;
    }

    try {
      const event = JSON.parse(trimmed);
      if (event.type === 'thread.started' && typeof event.thread_id === 'string') {
        return event.thread_id;
      }
    } catch {
      continue;
    }
  }

  return null;
}

async function prepareCodexHome({ codexHome, sourceCodexHome }) {
  if (!codexHome) {
    return;
  }

  await fs.mkdir(codexHome, { recursive: true });

  const sourceAuthPath = path.join(sourceCodexHome, 'auth.json');
  const targetAuthPath = path.join(codexHome, 'auth.json');

  await fs.copyFile(sourceAuthPath, targetAuthPath);
}

function shouldRetryWithIsolatedHome(error) {
  const details = [error?.message, error?.stdout, error?.stderr]
    .filter((value) => typeof value === 'string' && value.trim() !== '')
    .join('\n');

  return details.includes('attempt to write a readonly database')
    || details.includes('failed to initialize state runtime')
    || details.includes('failed to initialize in-process app-server client');
}

export function createCliCodexRunner({
  cwd,
  tempDir = os.tmpdir(),
  codexHome,
  sourceCodexHome = path.join(os.homedir(), '.codex'),
  preferIsolatedHome = false,
  execFile = execFileDefault,
} = {}) {
  return {
    async createThread() {
      return {
        threadId: `pending:${randomUUID()}`,
      };
    },

    async runTextTurn({ threadId, text }) {
      const messagePath = path.join(
        tempDir,
        `codex-feishu-last-message-${Date.now()}-${randomUUID()}.txt`,
      );

      const args = isPendingThreadId(threadId) || !threadId
        ? ['exec', ...buildSharedArgs(), messagePath, text]
        : [
            'exec',
            'resume',
            ...buildSharedArgs(),
            messagePath,
            threadId,
            text,
          ];

      async function executeTurn({ useIsolatedHome }) {
        if (useIsolatedHome) {
          await prepareCodexHome({ codexHome, sourceCodexHome });
        }

        const execOptions = { cwd };

        if (useIsolatedHome && codexHome) {
          execOptions.env = {
            ...process.env,
            CODEX_HOME: codexHome,
          };
        }

        return execFile('codex', args, execOptions);
      }

      let stdout;

      try {
        ({ stdout } = await executeTurn({
          useIsolatedHome: preferIsolatedHome,
        }));
      } catch (error) {
        if (!preferIsolatedHome && codexHome && shouldRetryWithIsolatedHome(error)) {
          ({ stdout } = await executeTurn({ useIsolatedHome: true }));
        } else {
          throw error;
        }
      }

      const replyText = await fs.readFile(messagePath, 'utf8');
      const resolvedThreadId =
        parseThreadStarted(stdout) ?? threadId;

      await fs.rm(messagePath, { force: true });

      return {
        threadId: resolvedThreadId,
        replyText: replyText.trim(),
      };
    },
  };
}
