import path from 'node:path';

import { loadConfig } from '../config/loadConfig.js';
import { createCliCodexRunner } from '../codex/cliExecRunner.js';
import { openDb } from '../db/openDb.js';
import { createChannelTransport } from '../feishu/channelTransport.js';
import { createTaskOrchestrator } from './taskOrchestrator.js';

export async function startLongConnection({
  settings,
  env,
  cwd = process.cwd(),
  codexRunner,
  codexRunnerFactory = createCliCodexRunner,
  channelTransportFactory = createChannelTransport,
} = {}) {
  const config = await loadConfig({ settings, env });
  const dbPath = path.join(config.dataDir, 'state.sqlite');
  const db = openDb(dbPath);

  let orchestrator = null;
  const transport = channelTransportFactory({
    appId: config.appId,
    appSecret: config.appSecret,
    onTextMessage: async (textEvent) => {
      await orchestrator.handleTextEvent(textEvent);
    },
    onRejectedMessage: (event) => {
      console.warn(
        `codex-feishu rejected message ${event.messageId} from chat ${event.chatId}: ${event.reason}`,
      );
    },
  });

  orchestrator = createTaskOrchestrator({
    db,
    codexRunner:
      codexRunner ??
      codexRunnerFactory({
        cwd,
        codexHome: path.join(config.dataDir, 'codex-home'),
      }),
    replyClient: {
      async sendText(reply) {
        await transport.sendText(reply);
      },
    },
  });

  await transport.start();

  return {
    config,
    transport,
    orchestrator,
  };
}
