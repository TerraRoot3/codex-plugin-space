import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

function ensureParentDir(filePath) {
  const parentDir = path.dirname(filePath);
  fs.mkdirSync(parentDir, { recursive: true });
}

export function openDb(filePath) {
  ensureParentDir(filePath);

  const db = new DatabaseSync(filePath);

  db.exec(`
    CREATE TABLE IF NOT EXISTS bindings (
      chat_id TEXT PRIMARY KEY,
      thread_id TEXT NOT NULL,
      mode TEXT NOT NULL,
      reply_to_feishu INTEGER NOT NULL DEFAULT 1
    )
  `);

  return db;
}
