import fs from 'node:fs';
import path from 'node:path';

import { listSavedSessions } from '../codex/listSavedSessions.js';
import { readStoredConfig, writeStoredConfig } from '../config/configStore.js';
import { readFileSecret, writeFileSecret } from '../config/fileSecretStore.js';
import { loadConfig } from '../config/loadConfig.js';
import {
  resolveConfigHome,
  resolveDataDir,
  resolveWorkspaceDir,
} from '../config/paths.js';
import { runOneShot } from '../daemon/runOneShot.js';
import {
  readDaemonStatus,
  startDaemon,
  stopDaemon,
} from '../daemon/processManager.js';
import {
  listBindings as listBindingsInDb,
} from '../db/bindingsRepo.js';
import { openDb } from '../db/openDb.js';

function createTextPayload({
  text,
  chatId = 'oc_demo',
  messageId = 'om_demo',
  senderOpenId = 'ou_demo',
}) {
  return {
    schema: '2.0',
    header: {
      event_type: 'im.message.receive_v1',
    },
    event: {
      sender: {
        sender_id: {
          open_id: senderOpenId,
        },
      },
      message: {
        message_id: messageId,
        chat_id: chatId,
        message_type: 'text',
        content: JSON.stringify({ text }),
      },
    },
  };
}

function countBindings(db) {
  const row = db
    .prepare('SELECT COUNT(*) AS binding_count FROM bindings')
    .get();

  return row?.binding_count ?? 0;
}

export function createMcpService({
  settings = {},
  env = process.env,
  readStoredConfigImpl = readStoredConfig,
  writeStoredConfigImpl = writeStoredConfig,
  readFileSecretImpl = readFileSecret,
  writeFileSecretImpl = writeFileSecret,
  readDaemonStatusImpl = readDaemonStatus,
  startDaemonImpl = startDaemon,
  stopDaemonImpl = stopDaemon,
  listSavedSessionsImpl = listSavedSessions,
  runOneShotImpl = runOneShot,
  openDbImpl = openDb,
  loadConfigImpl = loadConfig,
} = {}) {
  async function showBridgeStatus() {
    const storedConfig = await readStoredConfigImpl({ settings, env });
    const secret = await readFileSecretImpl({ settings, env });
    const configHome = resolveConfigHome({ settings, env });
    const dataDir = resolveDataDir({ settings, storedConfig, env });
    const workspaceDir = resolveWorkspaceDir({ settings, storedConfig, env });
    const daemon = await readDaemonStatusImpl({ settings, env });
    const dbPath = path.join(dataDir, 'state.sqlite');

    let bindingCount = 0;
    if (fs.existsSync(dbPath)) {
      const db = openDbImpl(dbPath);
      bindingCount = countBindings(db);
    }

    return {
      configured:
        typeof storedConfig.appId === 'string' &&
        storedConfig.appId.trim() !== '' &&
        typeof secret === 'string' &&
        secret.trim() !== '',
      config: {
        appId: storedConfig.appId ?? null,
        hasSecret: Boolean(secret),
        mode: storedConfig.mode ?? 'background',
        dataDir,
        workspaceDir: workspaceDir ?? null,
        configHome,
      },
      daemon,
      stats: {
        bindingCount,
      },
    };
  }

  return {
    async configureBridge({
      appId,
      appSecret,
      mode,
      dataDir,
      workspaceDir,
    } = {}) {
      const current = await readStoredConfigImpl({ settings, env });
      const nextConfig = {
        appId: appId ?? current.appId ?? null,
        mode: mode ?? current.mode ?? 'background',
        dataDir:
          dataDir ??
          current.dataDir ??
          resolveDataDir({ settings, storedConfig: current, env }),
        workspaceDir:
          workspaceDir ??
          current.workspaceDir ??
          resolveWorkspaceDir({ settings, storedConfig: current, env }) ??
          null,
      };

      await writeStoredConfigImpl({
        config: nextConfig,
        settings,
        env,
      });

      if (typeof appSecret === 'string' && appSecret.trim() !== '') {
        await writeFileSecretImpl(appSecret, { settings, env });
      }

      return showBridgeStatus();
    },

    showBridgeStatus,

    async startBridge() {
      await loadConfigImpl({ settings, env });
      const started = await startDaemonImpl({ settings, env });
      const status = await showBridgeStatus();

      return {
        ...status,
        daemon: started.status ?? status.daemon,
      };
    },

    async stopBridge() {
      const stopped = await stopDaemonImpl({ settings, env });
      const status = await showBridgeStatus();

      return {
        ...status,
        daemon: stopped.status ?? status.daemon,
      };
    },

    async listBindings() {
      const storedConfig = await readStoredConfigImpl({ settings, env });
      const dataDir = resolveDataDir({ settings, storedConfig, env });
      const dbPath = path.join(dataDir, 'state.sqlite');

      if (!fs.existsSync(dbPath)) {
        return [];
      }

      const db = openDbImpl(dbPath);
      return listBindingsInDb(db);
    },

    async listSavedCodexSessions({ limit = 20 } = {}) {
      return listSavedSessionsImpl({ limit });
    },

    async runTextMessageDemo({
      text,
      chatId = 'oc_demo',
      messageId = 'om_demo',
      senderOpenId = 'ou_demo',
    }) {
      const replies = [];
      const result = await runOneShotImpl({
        payload: createTextPayload({
          text,
          chatId,
          messageId,
          senderOpenId,
        }),
        env,
        replyClient: {
          async sendText(reply) {
            replies.push(reply);
          },
        },
      });

      return {
        threadId: result.threadId ?? null,
        replies,
      };
    },
  };
}
