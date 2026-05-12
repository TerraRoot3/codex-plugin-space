import path from 'node:path';

import { loadConfig } from '../config/loadConfig.js';
import { createCliCodexRunner } from '../codex/cliExecRunner.js';
import { openDb } from '../db/openDb.js';
import { createTaskOrchestrator } from './taskOrchestrator.js';

function createStdoutReplyClient() {
  return {
    async sendText(reply) {
      process.stdout.write(`${JSON.stringify(reply)}\n`);
    },
  };
}

export async function runOneShot({
  payload,
  settings,
  env,
  codexRunner,
  replyClient,
  cwd = process.cwd(),
} = {}) {
  const config = await loadConfig({ settings, env });
  const dbPath = path.join(config.dataDir, 'state.sqlite');
  const db = openDb(dbPath);

  const orchestrator = createTaskOrchestrator({
    db,
    codexRunner: codexRunner ?? createCliCodexRunner({ cwd }),
    replyClient: replyClient ?? createStdoutReplyClient(),
  });

  const result = await orchestrator.handleIncomingPayload(payload);

  return {
    config,
    ...result,
  };
}
