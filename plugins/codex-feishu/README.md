# Codex Feishu

This package is a text-first prototype for bridging Feishu bot messages into local Codex sessions.

## Current scope

- Text message ingress
- Feishu long-connection transport via the official Lark SDK
- Local Codex thread binding
- Text reply back to Feishu
- `/new`, `/bind`, and `/status`

## Configuration

Copy `.env.example` and provide:

- `FEISHU_APP_ID`
- `FEISHU_APP_SECRET`
- `CODEX_FEISHU_DATA_DIR`

## Scripts

- `npm test`
- `npm run start:daemon`
- `npm run start:mcp`

## One-shot text demo

You can simulate a Feishu text event locally:

```bash
FEISHU_APP_ID=cli_demo \
FEISHU_APP_SECRET=secret_demo \
npm --prefix plugins/codex-feishu run start:daemon -- --event-json '{"schema":"2.0","header":{"event_type":"im.message.receive_v1"},"event":{"sender":{"sender_id":{"open_id":"ou_demo"}},"message":{"message_id":"om_001","chat_id":"oc_demo","message_type":"text","content":"{\"text\":\"hello codex\"}"}}}'
```

This prototype currently supports:

- Text event parsing
- Local SQLite-backed chat-to-thread binding
- Codex CLI runner abstraction for new and resumed text turns

## Real Feishu long connection

Once `FEISHU_APP_ID` and `FEISHU_APP_SECRET` are configured for a self-built Feishu app with
message event subscription, start the daemon with no extra arguments:

```bash
FEISHU_APP_ID=cli_xxx \
FEISHU_APP_SECRET=xxx \
CODEX_FEISHU_DATA_DIR="$PWD/.codex-feishu-data" \
npm --prefix plugins/codex-feishu run start:daemon
```

The daemon will:

- open a Feishu long connection with the official `@larksuiteoapi/node-sdk`
- listen for text messages
- create or resume a Codex session per chat
- reply back into Feishu text messages, using message reply context when available

## Notes

- In this repository, the Codex execution path is wired through `codex exec` and `codex exec resume`.
- Nested execution inside the current Codex agent session may still fail because the local sandboxed
  environment is not the same as your normal desktop shell.
- The MCP server entry is still a placeholder. This branch focuses on proving the Feishu text path first.
