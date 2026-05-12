function parseTextContent(rawContent) {
  try {
    const parsed = JSON.parse(rawContent);
    return typeof parsed.text === 'string' ? parsed.text : null;
  } catch {
    return null;
  }
}

export function parseFeishuEvent(payload) {
  if (payload?.header?.event_type !== 'im.message.receive_v1') {
    return null;
  }

  const message = payload?.event?.message;
  if (!message || message.message_type !== 'text') {
    return null;
  }

  const text = parseTextContent(message.content);
  if (!text) {
    return null;
  }

  return {
    type: 'text',
    messageId: message.message_id,
    chatId: message.chat_id,
    senderOpenId: payload?.event?.sender?.sender_id?.open_id ?? null,
    text,
  };
}
