export function upsertBinding(
  db,
  { chatId, threadId, mode = 'background', replyToFeishu = true },
) {
  const statement = db.prepare(`
    INSERT INTO bindings (chat_id, thread_id, mode, reply_to_feishu)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(chat_id) DO UPDATE SET
      thread_id = excluded.thread_id,
      mode = excluded.mode,
      reply_to_feishu = excluded.reply_to_feishu
  `);

  statement.run(chatId, threadId, mode, replyToFeishu ? 1 : 0);
}

export function getBindingByChatId(db, chatId) {
  const statement = db.prepare(`
    SELECT chat_id, thread_id, mode, reply_to_feishu
    FROM bindings
    WHERE chat_id = ?
  `);
  const row = statement.get(chatId);

  if (!row) {
    return null;
  }

  return {
    chatId: row.chat_id,
    threadId: row.thread_id,
    mode: row.mode,
    replyToFeishu: Boolean(row.reply_to_feishu),
  };
}

export function listBindings(db) {
  const statement = db.prepare(`
    SELECT chat_id, thread_id, mode, reply_to_feishu
    FROM bindings
    ORDER BY chat_id ASC
  `);

  return statement.all().map((row) => ({
    chatId: row.chat_id,
    threadId: row.thread_id,
    mode: row.mode,
    replyToFeishu: Boolean(row.reply_to_feishu),
  }));
}
