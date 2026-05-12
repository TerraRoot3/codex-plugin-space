import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import {
  createCliCodexRunner,
} from '../src/codex/cliExecRunner.js';

async function createTempDir() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'codex-feishu-runner-'));
}

test('runTextTurn starts a new Codex session when no thread id exists', async () => {
  const tempDir = await createTempDir();
  const calls = [];

  try {
    const runner = createCliCodexRunner({
      cwd: '/tmp/project',
      tempDir,
      execFile: async (command, args) => {
        calls.push({ command, args });
        const outputIndex = args.indexOf('--output-last-message');
        const outputPath = args[outputIndex + 1];
        await fs.writeFile(outputPath, 'hello from codex', 'utf8');
        return {
          stdout: [
            'warning line',
            JSON.stringify({
              type: 'thread.started',
              thread_id: 'thread_123',
            }),
          ].join('\n'),
          stderr: '',
        };
      },
    });

    const result = await runner.runTextTurn({
      threadId: null,
      text: 'hello codex',
    });

    assert.equal(calls[0].command, 'codex');
    assert.deepEqual(calls[0].args.slice(0, 3), ['exec', '--json', '--output-last-message']);
    assert.equal(result.threadId, 'thread_123');
    assert.equal(result.replyText, 'hello from codex');
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
});

test('runTextTurn resumes an existing Codex session when a thread id exists', async () => {
  const tempDir = await createTempDir();
  const calls = [];

  try {
    const runner = createCliCodexRunner({
      cwd: '/tmp/project',
      tempDir,
      execFile: async (command, args) => {
        calls.push({ command, args });
        const outputIndex = args.indexOf('--output-last-message');
        const outputPath = args[outputIndex + 1];
        await fs.writeFile(outputPath, 'continued reply', 'utf8');
        return {
          stdout: '',
          stderr: '',
        };
      },
    });

    const result = await runner.runTextTurn({
      threadId: 'thread_existing',
      text: 'follow up',
    });

    assert.deepEqual(calls[0].args.slice(0, 4), ['exec', 'resume', '--json', '--output-last-message']);
    assert.equal(calls[0].args[4].includes('codex-feishu-last-message'), true);
    assert.equal(calls[0].args[5], 'thread_existing');
    assert.equal(calls[0].args[6], 'follow up');
    assert.equal(result.threadId, 'thread_existing');
    assert.equal(result.replyText, 'continued reply');
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
});

test('createThread returns a pending thread placeholder for /new', async () => {
  const runner = createCliCodexRunner({
    cwd: '/tmp/project',
    execFile: async () => {
      throw new Error('should not execute codex for createThread');
    },
  });

  const created = await runner.createThread();

  assert.equal(created.threadId.startsWith('pending:'), true);
});
