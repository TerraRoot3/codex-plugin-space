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
  codexRunnerFactory = createCliCodexRunner,
  replyClient,
  cwd,
} = {}) {
  const config = await loadConfig({ settings, env });
  const workspaceDir = cwd ?? config.workspaceDir ?? process.cwd();
  const dbPath = path.join(config.dataDir, 'state.sqlite');
  const db = openDb(dbPath);

  const orchestrator = createTaskOrchestrator({
    db,
    codexRunner:
      codexRunner ??
      codexRunnerFactory({
        cwd: workspaceDir,
        codexHome: path.join(config.dataDir, 'codex-home'),
      }),
    replyClient: replyClient ?? createStdoutReplyClient(),
  });

  const result = await orchestrator.handleIncomingPayload(payload);

  return {
    config,
    ...result,
  };
}
