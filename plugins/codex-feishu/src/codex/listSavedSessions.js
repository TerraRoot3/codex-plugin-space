import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

function defaultSessionIndexPath() {
  return path.join(os.homedir(), '.codex', 'session_index.jsonl');
}

function toTimestamp(value) {
  const parsed = Date.parse(value ?? '');
  return Number.isNaN(parsed) ? 0 : parsed;
}

export async function listSavedSessions({
  sessionIndexPath = defaultSessionIndexPath(),
  limit = 20,
  readFile = fs.readFile,
} = {}) {
  let contents = '';

  try {
    contents = await readFile(sessionIndexPath, 'utf8');
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return [];
    }
    throw error;
  }

  const latestByThreadId = new Map();

  for (const line of contents.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }

    let parsed = null;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      continue;
    }

    if (typeof parsed?.id !== 'string') {
      continue;
    }

    const candidate = {
      threadId: parsed.id,
      threadName:
        typeof parsed.thread_name === 'string' && parsed.thread_name.trim() !== ''
          ? parsed.thread_name
          : parsed.id,
      updatedAt:
        typeof parsed.updated_at === 'string' && parsed.updated_at.trim() !== ''
          ? parsed.updated_at
          : null,
    };

    const previous = latestByThreadId.get(candidate.threadId);
    if (!previous || toTimestamp(candidate.updatedAt) >= toTimestamp(previous.updatedAt)) {
      latestByThreadId.set(candidate.threadId, candidate);
    }
  }

  return Array.from(latestByThreadId.values())
    .sort((left, right) => toTimestamp(right.updatedAt) - toTimestamp(left.updatedAt))
    .slice(0, limit);
}
