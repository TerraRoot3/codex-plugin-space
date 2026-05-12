import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { listSavedSessions } from '../src/codex/listSavedSessions.js';

function createTempFile(contents) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-feishu-sessions-'));
  const filePath = path.join(tempDir, 'session_index.jsonl');
  fs.writeFileSync(filePath, contents, 'utf8');

  return {
    filePath,
    cleanup() {
      fs.rmSync(tempDir, { recursive: true, force: true });
    },
  };
}

test('listSavedSessions returns latest unique sessions sorted by updated time', async () => {
  const temp = createTempFile(
    [
      JSON.stringify({
        id: 'thread_001',
        thread_name: 'older name',
        updated_at: '2026-05-10T10:00:00.000Z',
      }),
      JSON.stringify({
        id: 'thread_002',
        thread_name: 'newer thread',
        updated_at: '2026-05-12T10:00:00.000Z',
      }),
      JSON.stringify({
        id: 'thread_001',
        thread_name: 'latest name',
        updated_at: '2026-05-11T10:00:00.000Z',
      }),
    ].join('\n'),
  );

  try {
    const sessions = await listSavedSessions({
      sessionIndexPath: temp.filePath,
    });

    assert.deepEqual(sessions, [
      {
        threadId: 'thread_002',
        threadName: 'newer thread',
        updatedAt: '2026-05-12T10:00:00.000Z',
      },
      {
        threadId: 'thread_001',
        threadName: 'latest name',
        updatedAt: '2026-05-11T10:00:00.000Z',
      },
    ]);
  } finally {
    temp.cleanup();
  }
});
