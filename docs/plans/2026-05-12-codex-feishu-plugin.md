# Codex Feishu Plugin Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a locally installable Codex plugin that connects a Feishu bot to Codex threads with background processing, multimodal messaging, session binding, and approval-aware execution.

**Architecture:** The plugin package provides manifest metadata, a local MCP bridge, and a local daemon entrypoint. The daemon keeps the Feishu connection alive, manages bindings and recovery state in SQLite, and drives Codex through `codex app-server`. The MCP bridge exposes session and messaging tools back into Codex.

**Tech Stack:** TypeScript or Node.js runtime for daemon and MCP bridge, SQLite, local file storage, Codex plugin manifests, Feishu bot APIs, `codex app-server`, automated tests, and fixture-based integration tests.

---

### Task 1: Scaffold the plugin package

**Files:**
- Create: `plugins/codex-feishu/.codex-plugin/plugin.json`
- Create: `plugins/codex-feishu/.mcp.json`
- Create: `plugins/codex-feishu/.app.json`
- Create: `plugins/codex-feishu/package.json`
- Create: `plugins/codex-feishu/README.md`
- Create: `plugins/codex-feishu/.env.example`
- Create: `plugins/codex-feishu/assets/.gitkeep`

**Step 1: Write the failing manifest validation test**

Create `plugins/codex-feishu/tests/plugin-manifest.test.ts` with checks that required plugin files exist and contain expected top-level fields.

**Step 2: Run test to verify it fails**

Run: `npm test -- plugins/codex-feishu/tests/plugin-manifest.test.ts`
Expected: FAIL because manifest files do not exist yet.

**Step 3: Write minimal implementation**

Create the plugin manifest files with placeholder-safe metadata, local MCP server registration, app metadata, README install notes, and example environment variables.

**Step 4: Run test to verify it passes**

Run: `npm test -- plugins/codex-feishu/tests/plugin-manifest.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add plugins/codex-feishu/.codex-plugin/plugin.json plugins/codex-feishu/.mcp.json plugins/codex-feishu/.app.json plugins/codex-feishu/package.json plugins/codex-feishu/README.md plugins/codex-feishu/.env.example plugins/codex-feishu/assets/.gitkeep plugins/codex-feishu/tests/plugin-manifest.test.ts
git commit -m "feat: scaffold codex feishu plugin package"
```

### Task 2: Build configuration loading and secret handling

**Files:**
- Create: `plugins/codex-feishu/src/config/loadConfig.ts`
- Create: `plugins/codex-feishu/src/config/types.ts`
- Create: `plugins/codex-feishu/src/config/keychain.ts`
- Create: `plugins/codex-feishu/src/config/fileSecretStore.ts`
- Create: `plugins/codex-feishu/tests/loadConfig.test.ts`

**Step 1: Write the failing test**

Write tests that load config from settings payload, then `.env`, and confirm settings values win over environment values. Add tests for missing `App ID` and `App Secret`.

**Step 2: Run test to verify it fails**

Run: `npm test -- plugins/codex-feishu/tests/loadConfig.test.ts`
Expected: FAIL because config loader is missing.

**Step 3: Write minimal implementation**

Implement config typing, source precedence, Keychain-first secret lookup, file fallback with permission checks, and validation errors for missing required values.

**Step 4: Run test to verify it passes**

Run: `npm test -- plugins/codex-feishu/tests/loadConfig.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add plugins/codex-feishu/src/config plugins/codex-feishu/tests/loadConfig.test.ts
git commit -m "feat: add config loading and secret storage"
```

### Task 3: Create SQLite schema and persistence layer

**Files:**
- Create: `plugins/codex-feishu/src/db/schema.sql`
- Create: `plugins/codex-feishu/src/db/openDb.ts`
- Create: `plugins/codex-feishu/src/db/bindingsRepo.ts`
- Create: `plugins/codex-feishu/src/db/sessionsRepo.ts`
- Create: `plugins/codex-feishu/src/db/tasksRepo.ts`
- Create: `plugins/codex-feishu/src/db/approvalsRepo.ts`
- Create: `plugins/codex-feishu/tests/dbRepos.test.ts`

**Step 1: Write the failing test**

Write tests for creating a binding, updating it with `/new`, listing cached sessions, storing task states, and marking interrupted tasks for recovery.

**Step 2: Run test to verify it fails**

Run: `npm test -- plugins/codex-feishu/tests/dbRepos.test.ts`
Expected: FAIL because the database layer does not exist.

**Step 3: Write minimal implementation**

Create one SQLite database schema with tables for bindings, session cache, tasks, approvals, and media metadata. Implement repository helpers for core reads and writes.

**Step 4: Run test to verify it passes**

Run: `npm test -- plugins/codex-feishu/tests/dbRepos.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add plugins/codex-feishu/src/db plugins/codex-feishu/tests/dbRepos.test.ts
git commit -m "feat: add plugin persistence layer"
```

### Task 4: Implement Feishu message parsing and command routing

**Files:**
- Create: `plugins/codex-feishu/src/feishu/messageTypes.ts`
- Create: `plugins/codex-feishu/src/feishu/parseEvent.ts`
- Create: `plugins/codex-feishu/src/commands/parseCommand.ts`
- Create: `plugins/codex-feishu/src/commands/handleCommand.ts`
- Create: `plugins/codex-feishu/tests/parseEvent.test.ts`
- Create: `plugins/codex-feishu/tests/parseCommand.test.ts`

**Step 1: Write the failing test**

Add fixtures for text, image, file, and audio events plus commands `/new`, `/sessions`, `/bind`, `/unbind`, `/status`, `/mode background`, `/mode current`, `/approve`, and `/deny`.

**Step 2: Run test to verify it fails**

Run: `npm test -- plugins/codex-feishu/tests/parseEvent.test.ts plugins/codex-feishu/tests/parseCommand.test.ts`
Expected: FAIL because parsers and command routing are missing.

**Step 3: Write minimal implementation**

Implement event classification, command parsing, normalized message models, and a basic command dispatch interface.

**Step 4: Run test to verify it passes**

Run: `npm test -- plugins/codex-feishu/tests/parseEvent.test.ts plugins/codex-feishu/tests/parseCommand.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add plugins/codex-feishu/src/feishu plugins/codex-feishu/src/commands plugins/codex-feishu/tests/parseEvent.test.ts plugins/codex-feishu/tests/parseCommand.test.ts
git commit -m "feat: add feishu message parsing and commands"
```

### Task 5: Add media download, upload, and transcription pipeline

**Files:**
- Create: `plugins/codex-feishu/src/media/downloadMedia.ts`
- Create: `plugins/codex-feishu/src/media/uploadMedia.ts`
- Create: `plugins/codex-feishu/src/media/transcribeAudio.ts`
- Create: `plugins/codex-feishu/src/media/normalizeInput.ts`
- Create: `plugins/codex-feishu/tests/normalizeInput.test.ts`

**Step 1: Write the failing test**

Write tests that verify text passes through, image and file inputs are normalized with metadata, audio inputs produce both attachment references and transcript text, and transcription failure degrades gracefully.

**Step 2: Run test to verify it fails**

Run: `npm test -- plugins/codex-feishu/tests/normalizeInput.test.ts`
Expected: FAIL because media normalization is not implemented.

**Step 3: Write minimal implementation**

Implement download and upload adapters, local file staging, transcription interface, multimodal input normalization, and failure downgrade behavior.

**Step 4: Run test to verify it passes**

Run: `npm test -- plugins/codex-feishu/tests/normalizeInput.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add plugins/codex-feishu/src/media plugins/codex-feishu/tests/normalizeInput.test.ts
git commit -m "feat: add multimodal media pipeline"
```

### Task 6: Add Codex App Server client and session lifecycle helpers

**Files:**
- Create: `plugins/codex-feishu/src/codex/appServerClient.ts`
- Create: `plugins/codex-feishu/src/codex/sessionService.ts`
- Create: `plugins/codex-feishu/src/codex/turnRunner.ts`
- Create: `plugins/codex-feishu/tests/sessionService.test.ts`

**Step 1: Write the failing test**

Write tests around `thread/start`, `thread/resume`, `thread/list`, `thread/read`, and `turn/start` request shaping, plus fallback logic for current-session mode.

**Step 2: Run test to verify it fails**

Run: `npm test -- plugins/codex-feishu/tests/sessionService.test.ts`
Expected: FAIL because the Codex App Server client does not exist.

**Step 3: Write minimal implementation**

Implement a JSON-RPC client over `stdio`, session listing helpers, resume-or-create behavior, and a turn runner that yields structured progress events.

**Step 4: Run test to verify it passes**

Run: `npm test -- plugins/codex-feishu/tests/sessionService.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add plugins/codex-feishu/src/codex plugins/codex-feishu/tests/sessionService.test.ts
git commit -m "feat: add codex app server client"
```

### Task 7: Implement approval state machine

**Files:**
- Create: `plugins/codex-feishu/src/approvals/types.ts`
- Create: `plugins/codex-feishu/src/approvals/approvalService.ts`
- Create: `plugins/codex-feishu/src/approvals/policy.ts`
- Create: `plugins/codex-feishu/tests/approvalService.test.ts`

**Step 1: Write the failing test**

Write tests for low-risk auto-approve, high-risk pending approval, explicit approve, explicit deny, and approval timeout.

**Step 2: Run test to verify it fails**

Run: `npm test -- plugins/codex-feishu/tests/approvalService.test.ts`
Expected: FAIL because the approval service is missing.

**Step 3: Write minimal implementation**

Implement approval policy classification, persistence-backed approval records, and lifecycle transitions from pending to approved, denied, or timed out.

**Step 4: Run test to verify it passes**

Run: `npm test -- plugins/codex-feishu/tests/approvalService.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add plugins/codex-feishu/src/approvals plugins/codex-feishu/tests/approvalService.test.ts
git commit -m "feat: add approval workflow"
```

### Task 8: Build outbound Feishu reply formatter

**Files:**
- Create: `plugins/codex-feishu/src/feishu/formatProgress.ts`
- Create: `plugins/codex-feishu/src/feishu/formatFinalStatus.ts`
- Create: `plugins/codex-feishu/src/feishu/sendReply.ts`
- Create: `plugins/codex-feishu/tests/sendReply.test.ts`

**Step 1: Write the failing test**

Write tests for throttled progress updates, final status rendering, native multimodal outputs, summary text attachment, and downgrade-to-file behavior.

**Step 2: Run test to verify it fails**

Run: `npm test -- plugins/codex-feishu/tests/sendReply.test.ts`
Expected: FAIL because outbound formatting is not implemented.

**Step 3: Write minimal implementation**

Implement progress message summaries, final status payload generation, native message type senders, and text-summary fallback rules.

**Step 4: Run test to verify it passes**

Run: `npm test -- plugins/codex-feishu/tests/sendReply.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add plugins/codex-feishu/src/feishu/formatProgress.ts plugins/codex-feishu/src/feishu/formatFinalStatus.ts plugins/codex-feishu/src/feishu/sendReply.ts plugins/codex-feishu/tests/sendReply.test.ts
git commit -m "feat: add feishu reply formatting"
```

### Task 9: Build the daemon orchestration loop

**Files:**
- Create: `plugins/codex-feishu/src/daemon/main.ts`
- Create: `plugins/codex-feishu/src/daemon/eventLoop.ts`
- Create: `plugins/codex-feishu/src/daemon/taskOrchestrator.ts`
- Create: `plugins/codex-feishu/src/daemon/recovery.ts`
- Create: `plugins/codex-feishu/tests/taskOrchestrator.test.ts`

**Step 1: Write the failing test**

Write tests for the end-to-end control flow: new message intake, session resolution, turn execution, progress sync, final status sync, and restart recovery markers.

**Step 2: Run test to verify it fails**

Run: `npm test -- plugins/codex-feishu/tests/taskOrchestrator.test.ts`
Expected: FAIL because orchestration does not exist.

**Step 3: Write minimal implementation**

Implement the daemon bootstrap, retry-safe event loop, orchestrator pipeline, and recovery logic for interrupted tasks and reconnect handling.

**Step 4: Run test to verify it passes**

Run: `npm test -- plugins/codex-feishu/tests/taskOrchestrator.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add plugins/codex-feishu/src/daemon plugins/codex-feishu/tests/taskOrchestrator.test.ts
git commit -m "feat: add feishu daemon orchestration"
```

### Task 10: Expose Codex-side MCP management tools

**Files:**
- Create: `plugins/codex-feishu/src/mcp/server.ts`
- Create: `plugins/codex-feishu/src/mcp/tools/listCodexSessions.ts`
- Create: `plugins/codex-feishu/src/mcp/tools/bindSession.ts`
- Create: `plugins/codex-feishu/src/mcp/tools/unbindSession.ts`
- Create: `plugins/codex-feishu/src/mcp/tools/sendFeishuMessage.ts`
- Create: `plugins/codex-feishu/tests/mcpTools.test.ts`

**Step 1: Write the failing test**

Write tests that verify the MCP tool registration and behavior for listing sessions, binding a session, unbinding a session, and sending a Feishu reply from Codex.

**Step 2: Run test to verify it fails**

Run: `npm test -- plugins/codex-feishu/tests/mcpTools.test.ts`
Expected: FAIL because the MCP bridge is missing.

**Step 3: Write minimal implementation**

Implement the MCP server bootstrap and each management tool against the persistence and daemon services.

**Step 4: Run test to verify it passes**

Run: `npm test -- plugins/codex-feishu/tests/mcpTools.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add plugins/codex-feishu/src/mcp plugins/codex-feishu/tests/mcpTools.test.ts
git commit -m "feat: add codex feishu mcp tools"
```

### Task 11: Add settings UI and current-session controls

**Files:**
- Create: `plugins/codex-feishu/src/app/settingsView.tsx`
- Create: `plugins/codex-feishu/src/app/sessionPicker.tsx`
- Create: `plugins/codex-feishu/src/app/modeToggle.tsx`
- Create: `plugins/codex-feishu/tests/settingsView.test.tsx`

**Step 1: Write the failing test**

Write tests for rendering `App ID`, `App Secret`, runtime mode selection, saved-session list, and settings-precedence behavior.

**Step 2: Run test to verify it fails**

Run: `npm test -- plugins/codex-feishu/tests/settingsView.test.tsx`
Expected: FAIL because the settings UI does not exist.

**Step 3: Write minimal implementation**

Implement a simple settings view that edits credentials and mode, lists saved sessions, and allows selecting the current foreground target session.

**Step 4: Run test to verify it passes**

Run: `npm test -- plugins/codex-feishu/tests/settingsView.test.tsx`
Expected: PASS.

**Step 5: Commit**

```bash
git add plugins/codex-feishu/src/app plugins/codex-feishu/tests/settingsView.test.tsx
git commit -m "feat: add plugin settings ui"
```

### Task 12: Add documentation, fixtures, and manual verification steps

**Files:**
- Modify: `plugins/codex-feishu/README.md`
- Create: `plugins/codex-feishu/docs/testing.md`
- Create: `plugins/codex-feishu/tests/fixtures/`
- Create: `plugins/codex-feishu/docs/commands.md`

**Step 1: Write the failing docs review checklist**

Create a checklist that requires install instructions, config examples, command reference, approval model, multimodal support notes, and manual test instructions.

**Step 2: Run review to verify it fails**

Run: `rg -n "TODO|TBD" plugins/codex-feishu/README.md plugins/codex-feishu/docs`
Expected: FAIL because docs are incomplete or placeholders remain.

**Step 3: Write minimal implementation**

Document installation, settings, command usage, local daemon behavior, multimodal support, approval policy, troubleshooting, and test fixtures.

**Step 4: Run review to verify it passes**

Run: `rg -n "TODO|TBD" plugins/codex-feishu/README.md plugins/codex-feishu/docs`
Expected: no matches.

**Step 5: Commit**

```bash
git add plugins/codex-feishu/README.md plugins/codex-feishu/docs plugins/codex-feishu/tests/fixtures
git commit -m "docs: add codex feishu plugin documentation"
```

### Task 13: Run full verification before release

**Files:**
- Modify: `plugins/codex-feishu/package.json`
- Modify: `plugins/codex-feishu/README.md`

**Step 1: Write the failing release check script**

Add a script that runs unit tests, integration tests, lint, and a smoke validation for required plugin files.

**Step 2: Run script to verify it fails**

Run: `npm run verify`
Expected: FAIL until all missing scripts or validations are wired up.

**Step 3: Write minimal implementation**

Add `verify`, `test`, and smoke-check scripts plus final README release instructions for local install and GitHub publishing.

**Step 4: Run test to verify it passes**

Run: `npm run verify`
Expected: PASS.

**Step 5: Commit**

```bash
git add plugins/codex-feishu/package.json plugins/codex-feishu/README.md
git commit -m "chore: add release verification workflow"
```
