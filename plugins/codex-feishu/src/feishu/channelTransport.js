import {
  createLarkChannel,
  LoggerLevel,
} from '@larksuiteoapi/node-sdk';

function normalizeIncomingMessage(message) {
  if (message?.rawContentType !== 'text') {
    return null;
  }

  return {
    messageId: message.messageId,
    chatId: message.chatId,
    senderOpenId: message.senderId,
    text: message.content,
    replyToMessageId: message.replyToMessageId,
  };
}

export function createChannelTransport({
  appId,
  appSecret,
  onTextMessage,
  onRejectedMessage,
  channelFactory = createLarkChannel,
}) {
  const channel = channelFactory({
    appId,
    appSecret,
    loggerLevel: LoggerLevel.debug,
    policy: {
      requireMention: false,
    },
  });

  return {
    channel,
    async start() {
      channel.on('message', async (message) => {
        console.info(
          `codex-feishu incoming message ${message.messageId} type=${message.rawContentType} chat=${message.chatId}`,
        );
        const normalized = normalizeIncomingMessage(message);
        if (!normalized) {
          return;
        }

        await onTextMessage(normalized);
      });
      channel.on('reject', (event) => {
        if (typeof onRejectedMessage === 'function') {
          onRejectedMessage(event);
        }
      });

      await channel.connect();
    },
    async sendText({ chatId, text, replyToMessageId }) {
      await channel.send(
        chatId,
        { text },
        replyToMessageId ? { replyTo: replyToMessageId } : undefined,
      );
    },
    async disconnect() {
      if (typeof channel.disconnect === 'function') {
        await channel.disconnect();
      }
    },
  };
}
