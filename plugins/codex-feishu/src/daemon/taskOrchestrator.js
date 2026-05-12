import { parseCommand } from '../commands/parseCommand.js';
import {
  getBindingByChatId,
  upsertBinding,
} from '../db/bindingsRepo.js';
import { parseFeishuEvent } from '../feishu/parseEvent.js';

async function handleCommand({
  db,
  codexRunner,
  replyClient,
  textEvent,
  command,
}) {
  if (command.name === 'new') {
    const created = await codexRunner.createThread();
    upsertBinding(db, {
      chatId: textEvent.chatId,
      threadId: created.threadId,
      mode: 'background',
      replyToFeishu: true,
    });
    await replyClient.sendText({
      chatId: textEvent.chatId,
      text: `Started a new Codex session: ${created.threadId}`,
      replyToMessageId: textEvent.messageId,
    });
    return;
  }

  if (command.name === 'bind') {
    const [threadId] = command.args;
    if (!threadId) {
      await replyClient.sendText({
        chatId: textEvent.chatId,
        text: 'Usage: /bind <threadId>',
        replyToMessageId: textEvent.messageId,
      });
      return;
    }
    upsertBinding(db, {
      chatId: textEvent.chatId,
      threadId,
      mode: 'background',
      replyToFeishu: true,
    });
    await replyClient.sendText({
      chatId: textEvent.chatId,
      text: `Bound this chat to Codex session: ${threadId}`,
      replyToMessageId: textEvent.messageId,
    });
    return;
  }

  if (command.name === 'status') {
    const binding = getBindingByChatId(db, textEvent.chatId);
    await replyClient.sendText({
      chatId: textEvent.chatId,
      text: binding
        ? `Current Codex session: ${binding.threadId} (${binding.mode})`
        : 'No Codex session is currently bound to this chat.',
      replyToMessageId: textEvent.messageId,
    });
    return;
  }

  await replyClient.sendText({
    chatId: textEvent.chatId,
    text: `Unsupported command: /${command.name}`,
    replyToMessageId: textEvent.messageId,
  });
}

export function createTaskOrchestrator({ db, codexRunner, replyClient }) {
  async function handleTextEvent(textEvent) {
    const command = parseCommand(textEvent.text);
    if (command) {
      await handleCommand({
        db,
        codexRunner,
        replyClient,
        textEvent,
        command,
      });
      return { handled: true, kind: 'command' };
    }

    const existingBinding = getBindingByChatId(db, textEvent.chatId);
    const result = await codexRunner.runTextTurn({
      chatId: textEvent.chatId,
      threadId: existingBinding?.threadId ?? null,
      text: textEvent.text,
    });

    upsertBinding(db, {
      chatId: textEvent.chatId,
      threadId: result.threadId,
      mode: 'background',
      replyToFeishu: true,
    });

    await replyClient.sendText({
      chatId: textEvent.chatId,
      text: result.replyText,
      replyToMessageId: textEvent.messageId,
    });

    return {
      handled: true,
      kind: 'text',
      threadId: result.threadId,
    };
  }

  return {
    async handleIncomingPayload(payload) {
      const parsedEvent = parseFeishuEvent(payload);
      if (!parsedEvent) {
        return { ignored: true };
      }

      return handleTextEvent(parsedEvent);
    },
    handleTextEvent,
  };
}
