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
    assert.deepEqual(calls[0].args.slice(0, 7), [
      'exec',
      '-c',
      'model_reasoning_effort="minimal"',
      '-c',
      'service_tier="fast"',
      '--json',
      '--output-last-message',
    ]);
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

    assert.deepEqual(calls[0].args.slice(0, 8), [
      'exec',
      'resume',
      '-c',
      'model_reasoning_effort="minimal"',
      '-c',
      'service_tier="fast"',
      '--json',
      '--output-last-message',
    ]);
    assert.equal(calls[0].args[8].includes('codex-feishu-last-message'), true);
    assert.equal(calls[0].args[9], 'thread_existing');
    assert.equal(calls[0].args[10], 'follow up');
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

test('runTextTurn executes codex with an isolated CODEX_HOME', async () => {
  const tempDir = await createTempDir();
  const codexHome = path.join(tempDir, 'codex-home');
  const calls = [];

  try {
    const runner = createCliCodexRunner({
      cwd: '/tmp/project',
      tempDir,
      codexHome,
      execFile: async (command, args, options) => {
        calls.push({ command, args, options });
        const outputIndex = args.indexOf('--output-last-message');
        const outputPath = args[outputIndex + 1];
        await fs.writeFile(outputPath, 'isolated home reply', 'utf8');
        return {
          stdout: '',
          stderr: '',
        };
      },
    });

    const result = await runner.runTextTurn({
      threadId: null,
      text: 'hello from isolated home',
    });

    assert.equal(result.replyText, 'isolated home reply');
    assert.equal(calls[0].options.env.CODEX_HOME, codexHome);
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
});

test('runTextTurn refreshes auth.json inside the isolated CODEX_HOME', async () => {
  const tempDir = await createTempDir();
  const codexHome = path.join(tempDir, 'codex-home');
  const sourceCodexHome = path.join(tempDir, 'source-codex-home');

  try {
    await fs.mkdir(codexHome, { recursive: true });
    await fs.mkdir(sourceCodexHome, { recursive: true });
    await fs.writeFile(
      path.join(codexHome, 'auth.json'),
      JSON.stringify({ stale: true }),
      'utf8',
    );
    await fs.writeFile(
      path.join(sourceCodexHome, 'auth.json'),
      JSON.stringify({ auth_mode: 'api_key', OPENAI_API_KEY: 'fresh-key' }),
      'utf8',
    );

    const runner = createCliCodexRunner({
      cwd: '/tmp/project',
      tempDir,
      codexHome,
      sourceCodexHome,
      execFile: async (command, args) => {
        const outputIndex = args.indexOf('--output-last-message');
        const outputPath = args[outputIndex + 1];
        await fs.writeFile(outputPath, 'reply after auth sync', 'utf8');
        return {
          stdout: '',
          stderr: '',
        };
      },
    });

    await runner.runTextTurn({
      threadId: null,
      text: 'hello after auth sync',
    });

    const syncedAuth = JSON.parse(
      await fs.readFile(path.join(codexHome, 'auth.json'), 'utf8'),
    );
    assert.deepEqual(syncedAuth, {
      auth_mode: 'api_key',
      OPENAI_API_KEY: 'fresh-key',
    });
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
});
