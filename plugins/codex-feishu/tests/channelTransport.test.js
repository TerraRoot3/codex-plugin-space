import test from 'node:test';
import assert from 'node:assert/strict';

import { createChannelTransport } from '../src/feishu/channelTransport.js';

test('channel transport connects and forwards text messages', async () => {
  const sent = [];
  const handlers = new Map();
  let connected = false;

  const fakeChannel = {
    on(name, handler) {
      handlers.set(name, handler);
      return () => handlers.delete(name);
    },
    async connect() {
      connected = true;
    },
    async send(chatId, body, options) {
      sent.push({ chatId, body, options });
    },
  };

  const received = [];
  const transport = createChannelTransport({
    appId: 'cli_demo',
    appSecret: 'secret_demo',
    onTextMessage(message) {
      received.push(message);
    },
    channelFactory() {
      return fakeChannel;
    },
  });

  await transport.start();
  await handlers.get('message')({
    messageId: 'om_001',
    chatId: 'oc_001',
    senderId: 'ou_demo',
    content: 'hello codex',
    rawContentType: 'text',
  });
  await transport.sendText({
    chatId: 'oc_001',
    text: 'hello from codex',
    replyToMessageId: 'om_001',
  });

  assert.equal(connected, true);
  assert.deepEqual(received, [
    {
      messageId: 'om_001',
      chatId: 'oc_001',
      senderOpenId: 'ou_demo',
      text: 'hello codex',
      replyToMessageId: undefined,
    },
  ]);
  assert.deepEqual(sent, [
    {
      chatId: 'oc_001',
      body: { text: 'hello from codex' },
      options: { replyTo: 'om_001' },
    },
  ]);
});

test('channel transport ignores non-text messages for the text-only prototype', async () => {
  const handlers = new Map();
  const received = [];

  const transport = createChannelTransport({
    appId: 'cli_demo',
    appSecret: 'secret_demo',
    onTextMessage(message) {
      received.push(message);
    },
    channelFactory() {
      return {
        on(name, handler) {
          handlers.set(name, handler);
          return () => handlers.delete(name);
        },
        async connect() {},
        async send() {},
      };
    },
  });

  await transport.start();
  await handlers.get('message')({
    messageId: 'om_002',
    chatId: 'oc_001',
    senderId: 'ou_demo',
    content: '[image]',
    rawContentType: 'image',
  });

  assert.deepEqual(received, []);
});
