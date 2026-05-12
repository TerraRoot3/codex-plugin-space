import { createLarkChannel } from '@larksuiteoapi/node-sdk';

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
  channelFactory = createLarkChannel,
}) {
  const channel = channelFactory({ appId, appSecret });

  return {
    channel,
    async start() {
      channel.on('message', async (message) => {
        const normalized = normalizeIncomingMessage(message);
        if (!normalized) {
          return;
        }

        await onTextMessage(normalized);
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
