# Codex Feishu Plugin Design

## Summary

Build a locally installed Codex plugin that connects a Feishu bot to Codex conversations. The plugin must support background processing, optional binding to an existing foreground Codex session, multimodal input and output, approval-aware execution, and explicit mapping between Feishu chats and saved Codex threads.

## Goals

- Let users install a GitHub-hosted Codex plugin locally and configure Feishu credentials with `App ID` and `App Secret`.
- Keep a local Feishu bot online through a background daemon.
- Support Feishu-originated tasks with progress updates, final status sync, and follow-up questions in the same Codex thread.
- Support `text`, `image`, `file`, and `audio` input from Feishu.
- Support multimodal output back to Feishu with native type delivery plus text summary.
- Let users list saved Codex sessions and bind a Feishu chat to a chosen session.
- Ensure non-Feishu-originated Codex sessions do not reply back to Feishu by default.
- Support configurable approvals with low-risk auto-run and high-risk confirmation.

## Non-Goals

- Cloud-hosted shared backend in the first version.
- Multi-tenant server deployment.
- Full enterprise policy engine beyond local white-list and approval controls.
- Perfect rendering parity for every possible rich Feishu card or unsupported artifact type.

## Chosen Approach

Use a single installable Codex plugin that packages a local MCP bridge and a separate local background daemon.

Why this approach:

- A pure MCP-only plugin is a bad fit for always-on Feishu long connections.
- A daemon is the right place for connection management, retries, downloads, uploads, and task recovery.
- The plugin still provides the user-facing installation surface, settings, and Codex-side tools.

## Architecture

### Components

1. `Codex plugin shell`
   - Contains `.codex-plugin/plugin.json`, `.mcp.json`, optional `.app.json`, `hooks/`, assets, and packaging metadata.
   - Declares the local MCP bridge and plugin UI metadata.

2. `Local background daemon`
   - Maintains the Feishu bot long connection.
   - Validates incoming events.
   - Downloads and uploads media.
   - Maps Feishu sessions to Codex threads.
   - Tracks task lifecycle and sends final status updates.

3. `Codex App Server client`
   - Talks to local `codex app-server` over `stdio` JSON-RPC.
   - Uses `thread/start` for new sessions.
   - Uses `thread/resume` for continued sessions.
   - Uses `thread/list` and `thread/read` for saved-session browsing.
   - Uses `turn/start` to run the actual request and stream events.

4. `MCP bridge`
   - Exposes local management and messaging tools to Codex.
   - Provides commands for listing sessions, binding sessions, checking status, and sending outbound Feishu messages.

5. `Local data store`
   - Persists bindings, session metadata cache, pending approvals, task history, and media staging metadata.

### High-Level Flow

1. Feishu sends an event to the local daemon.
2. The daemon validates, de-duplicates, and classifies the message.
3. The daemon resolves the active binding for the Feishu chat or thread.
4. The daemon starts or resumes the Codex thread.
5. The daemon sends a `turn/start` request with normalized multimodal inputs.
6. The daemon streams progress back to Feishu using throttled updates.
7. The daemon sends a final status message when the task ends.

## Session Model

### Binding Rules

- Each Feishu chat or reply thread maps to one active Codex thread by default.
- Repeated follow-up messages reuse the existing binding.
- `/new` creates a fresh Codex thread and switches the binding.
- `/bind <threadId|index>` binds the current Feishu conversation to an existing saved Codex thread.
- `/unbind` removes the Feishu-to-Codex mapping without deleting the Codex thread.

### Reply Rules

- Threads started from Feishu automatically get `reply_to_feishu = true`.
- Threads explicitly bound from Feishu also get `reply_to_feishu = true`.
- Regular Codex threads started outside Feishu default to `reply_to_feishu = false`.
- Non-Feishu threads never sync back unless explicitly bound.

### Runtime Modes

- `background`
  - Default mode.
  - The daemon runs independent Codex threads without depending on the currently focused desktop chat.

- `current`
  - Optional mode.
  - The daemon targets a currently selected Codex session when the user chooses to route Feishu messages there.
  - If the target session is missing or unavailable, the daemon falls back to `background` and informs the user.

## Feishu Command Set

- `/help`
  - Show capabilities, binding status, and common commands.
- `/new`
  - Create a new Codex thread and rebind the current Feishu conversation.
- `/sessions`
  - List locally available saved Codex sessions.
  - Return short indexes so users can bind by number.
- `/bind <threadId|index>`
  - Bind the current Feishu conversation to an existing session.
- `/unbind`
  - Remove the current binding.
- `/status`
  - Show the current binding, last task state, and daemon health.
- `/mode background`
  - Route future messages through daemon-managed threads.
- `/mode current`
  - Route future messages into the selected foreground Codex session.
- `/approve <id>`
  - Approve a pending high-risk action.
- `/deny <id>`
  - Reject a pending high-risk action.

## Configuration

### Supported Sources

1. Plugin settings UI
   - Preferred source.
2. Local `.env`
   - Fallback source.

### Required Settings

- `App ID`
- `App Secret`

### Additional Settings

- Default runtime mode
- Approval policy
- Progress sync enabled or disabled
- Local data directory override

### Environment Variables

- `FEISHU_APP_ID`
- `FEISHU_APP_SECRET`
- `CODEX_FEISHU_MODE`
- `CODEX_FEISHU_DATA_DIR`

### Secret Storage

- Prefer system Keychain for `App Secret`.
- Fall back to a local config file with `0600` permissions only when Keychain is unavailable.
- Never commit secrets into the repository or plugin manifest.

## Multimodal Input

### Supported Feishu Inputs

- `text`
- `image`
- `file`
- `audio`

### Input Handling Rules

- Text goes directly into the Codex request.
- Images are downloaded and attached as image inputs, with a short textual note.
- Files are preserved as original files and optionally parsed when their type is supported.
- Audio is handled through two parallel paths:
  - Preserve the original audio attachment.
  - Auto-transcribe the audio and include the transcript in the Codex request.

### Audio Notes

- The daemon treats voice messages as audio, not generic files.
- If transcription fails, the original audio is still forwarded and the request includes a note that transcription failed.

## Multimodal Output

### Output Strategy

Use native Feishu message types plus a short text summary.

### Supported Outputs

- Text reply
- Image reply
- File reply
- Audio reply

### Output Rules

- Send native text when the output is textual.
- Send native images with caption-style summary text.
- Send files with a short explanation of what the file contains.
- Send audio with transcript or summary when available.
- Unsupported artifact types degrade to file plus text explanation.

## Progress Sync and Final Status

### In-Progress Sync

- Send an initial "received and processing" message.
- Stream throttled progress updates instead of token-by-token spam.
- Summarize meaningful steps such as tool usage, approval waits, and major milestones.

### Final Status Sync

Every Feishu-originated or explicitly bound task ends with a final status message that includes:

- Task status:
  - `success`
  - `failed`
  - `cancelled`
  - `approval_timeout`
- A short outcome summary
- Key output content
- Native attachments when produced
- Failure reason and retry guidance when relevant

## Approval and Safety Model

### Policy

Use configurable white-list automation for low-risk actions and explicit confirmation for high-risk actions.

### Low-Risk Examples

- Reading local files
- Listing saved sessions
- Producing summaries
- Non-destructive analysis

### High-Risk Examples

- Destructive file operations
- Code pushes
- External side effects
- Network actions outside allowed policy
- Sending externally visible messages beyond the current Feishu task flow

### Approval Flow

1. Codex emits an approval request.
2. The daemon surfaces it to Feishu.
3. The user responds with `/approve <id>` or `/deny <id>`.
4. The daemon forwards the decision back to Codex.
5. If the approval times out, the task ends as `approval_timeout`.

## Local Storage Layout

### Repository Layout

- `plugins/codex-feishu/.codex-plugin/plugin.json`
- `plugins/codex-feishu/.mcp.json`
- `plugins/codex-feishu/.app.json`
- `plugins/codex-feishu/daemon/`
- `plugins/codex-feishu/mcp/`
- `plugins/codex-feishu/hooks/`
- `plugins/codex-feishu/assets/`
- `plugins/codex-feishu/docs/`

### User Data Directory

Default local data root:

- `~/.codex-feishu/`

Suggested contents:

- `config.json`
- `state.db`
- `downloads/`
- `uploads/`
- `transcripts/`
- `logs/`
- `approvals/`

### Persistence Design

- Prefer a single SQLite database such as `state.db` instead of separate per-feature databases.
- Store:
  - Feishu-to-Codex bindings
  - Session cache
  - Task history
  - Approval records
  - Media metadata
  - Recovery markers for interrupted tasks

## Failure Recovery

### Reliability Rules

- Use `message_id + chat_id` as the idempotency key to prevent duplicate execution.
- Auto-reconnect when the Feishu connection drops.
- Keep a retry queue for events not fully acknowledged by the daemon.

### Failure Cases

- `Feishu reconnect`
  - Reconnect automatically and continue pending event processing.
- `Duplicate delivery`
  - Skip duplicate execution and return the already known task state when possible.
- `Codex turn failure`
  - Mark the task failed, notify Feishu, and preserve the session binding.
- `Audio transcription failure`
  - Continue with original audio only and flag the missing transcript.
- `Attachment download failure`
  - Continue processing other usable inputs and report the attachment-specific problem.
- `Approval timeout`
  - Mark the task as timed out and notify Feishu.
- `Daemon restart`
  - Reload bindings, approvals, cached sessions, and interrupted task markers from local storage.
- `Missing current session`
  - Inform the user and fall back to background mode or request rebind.

## Testing Strategy

### Unit Tests

- Binding store read and write
- Command parsing
- Message classification
- Idempotency handling
- Approval state machine
- Output downgrade logic
- Input normalization for text, image, file, and audio

### Integration Tests

- Feishu text message to Codex to Feishu text reply
- Image, file, and audio ingest pipeline
- `/new`, `/sessions`, `/bind`, `/unbind`
- Background mode and current-session mode
- Approval accept and deny paths
- Final status sync after success and failure

### Recovery Tests

- Daemon restart with active bindings
- Duplicate message delivery
- Failed Codex turn
- Attachment download failure
- Approval timeout flow

### Manual Acceptance

- Install the plugin locally from the GitHub repository
- Configure `App ID` and `App Secret`
- Start a new Feishu-driven task
- Reuse the same session through follow-up messages
- Bind an existing saved Codex session
- Verify multimodal input and output
- Confirm that non-Feishu sessions do not reply back by default

## References

- Codex plugin packaging supports plugin manifests, MCP servers, apps, and hooks:
  - <https://developers.openai.com/codex/plugins/build>
- Codex App Server supports local `stdio` JSON-RPC and thread lifecycle operations:
  - <https://developers.openai.com/codex/app-server>
- Codex usage patterns include chat-driven task execution:
  - <https://developers.openai.com/codex/use-cases>
