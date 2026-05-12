import test from 'node:test';
import assert from 'node:assert/strict';

import { parseFeishuEvent } from '../src/feishu/parseEvent.js';

test('parseFeishuEvent extracts text message payloads', () => {
  const event = parseFeishuEvent({
    schema: '2.0',
    header: {
      event_type: 'im.message.receive_v1',
    },
    event: {
      sender: {
        sender_id: {
          open_id: 'ou_demo',
        },
      },
      message: {
        message_id: 'om_001',
        chat_id: 'oc_001',
        message_type: 'text',
        content: '{"text":"hello codex"}',
      },
    },
  });

  assert.deepEqual(event, {
    type: 'text',
    messageId: 'om_001',
    chatId: 'oc_001',
    senderOpenId: 'ou_demo',
    text: 'hello codex',
  });
});

test('parseFeishuEvent returns null for unsupported event types', () => {
  const event = parseFeishuEvent({
    schema: '2.0',
    header: {
      event_type: 'im.message.message_read_v1',
    },
    event: {},
  });

  assert.equal(event, null);
});
