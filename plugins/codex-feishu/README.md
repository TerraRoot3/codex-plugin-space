# Codex Feishu

This package is a text-first local bridge for sending Feishu bot messages into Codex sessions.

## Current scope

- Text message ingress
- Feishu long-connection transport via the official Lark SDK
- Local Codex thread binding and background daemon management
- MCP tools for bridge configuration and runtime status
- Text reply back to Feishu
- `/new`, `/bind`, and `/status`

## Configuration

You have two ways to configure the bridge:

1. Preferred: install the plugin and ask Codex to call the MCP tool `configure_feishu_bridge`
2. Fallback: copy `.env.example` and provide environment variables manually

Supported values:

- `FEISHU_APP_ID`
- `FEISHU_APP_SECRET`
- `CODEX_FEISHU_DATA_DIR`
- `CODEX_FEISHU_HOME`

`CODEX_FEISHU_HOME` defaults to `~/.codex-feishu`. The plugin stores its local config, secret,
daemon pid, and daemon log there.

## Scripts

- `npm test`
- `npm run start:daemon`
- `npm run start:mcp`

## MCP tools

After installation, the plugin exposes these MCP tools inside Codex:

- `configure_feishu_bridge`
- `show_feishu_bridge_status`
- `start_feishu_bridge`
- `stop_feishu_bridge`
- `list_feishu_bindings`
- `list_saved_codex_sessions`
- `run_text_message_demo`

The plugin details page is metadata-only. The actual App ID / Secret setup happens through these
MCP tools and the local config files they manage.

## One-shot text demo

You can simulate a Feishu text event locally:

```bash
FEISHU_APP_ID=cli_demo \
FEISHU_APP_SECRET=secret_demo \
npm --prefix plugins/codex-feishu run start:daemon -- --event-json '{"schema":"2.0","header":{"event_type":"im.message.receive_v1"},"event":{"sender":{"sender_id":{"open_id":"ou_demo"}},"message":{"message_id":"om_001","chat_id":"oc_demo","message_type":"text","content":"{\"text\":\"hello codex\"}"}}}'
```

This bridge currently supports:

- Text event parsing
- Local SQLite-backed chat-to-thread binding
- Codex CLI runner abstraction for new and resumed text turns
- MCP-based local configuration and daemon lifecycle management

## Real Feishu long connection

Once `FEISHU_APP_ID` and `FEISHU_APP_SECRET` are configured for a self-built Feishu app with
message event subscription, start the daemon with no extra arguments:

```bash
FEISHU_APP_ID=cli_xxx \
FEISHU_APP_SECRET=xxx \
CODEX_FEISHU_DATA_DIR="$PWD/.codex-feishu-data" \
npm --prefix plugins/codex-feishu run start:daemon
```

Or, from inside Codex, use:

- `configure_feishu_bridge` to save the credentials
- `start_feishu_bridge` to launch the background daemon
- `show_feishu_bridge_status` to confirm the daemon and bindings

The daemon will:

- open a Feishu long connection with the official `@larksuiteoapi/node-sdk`
- listen for text messages
- create or resume a Codex session per chat
- reply back into Feishu text messages, using message reply context when available

## Notes

- In this repository, the Codex execution path is wired through `codex exec` and `codex exec resume`.
- Nested execution inside the current Codex agent session may still fail because the local sandboxed
  environment is not the same as your normal desktop shell.
- The MCP server now exposes configuration, status, binding, session, and text-demo tools.
- The plugin details page does not currently render a custom App ID / Secret form because `.app.json`
  is connector metadata, not a generic settings schema.
