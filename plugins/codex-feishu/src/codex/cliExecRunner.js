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

export function createCliCodexRunner({
  cwd,
  tempDir = os.tmpdir(),
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
        ? ['exec', '--json', '--output-last-message', messagePath, text]
        : [
            'exec',
            'resume',
            '--json',
            '--output-last-message',
            messagePath,
            threadId,
            text,
          ];

      const { stdout } = await execFile('codex', args, { cwd });
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
