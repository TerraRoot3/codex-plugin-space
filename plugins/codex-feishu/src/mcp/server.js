import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import * as z from 'zod/v4';

import { createMcpService } from './service.js';

function asToolResult(summary, structuredContent) {
  return {
    content: [
      {
        type: 'text',
        text: `${summary}\n${JSON.stringify(structuredContent, null, 2)}`,
      },
    ],
    structuredContent,
  };
}

function createServer() {
  const service = createMcpService();
  const server = new McpServer({
    name: 'codex-feishu',
    version: '0.1.0',
  });

  server.registerTool(
    'configure_feishu_bridge',
    {
      title: 'Configure Feishu Bridge',
      description:
        'Save the Feishu App ID, App Secret, mode, and data directory used by the local bridge.',
      inputSchema: {
        appId: z.string().optional().describe('Feishu app id'),
        appSecret: z.string().optional().describe('Feishu app secret'),
        mode: z
          .enum(['background', 'current'])
          .optional()
          .describe('Bridge execution mode'),
        dataDir: z
          .string()
          .optional()
          .describe('Optional path for bridge runtime data'),
      },
    },
    async (input) => {
      const result = await service.configureBridge(input);
      return asToolResult('Saved Codex Feishu bridge configuration.', result);
    },
  );

  server.registerTool(
    'show_feishu_bridge_status',
    {
      title: 'Show Bridge Status',
      description:
        'Show whether the local Feishu bridge is configured, running, and how many chat bindings exist.',
      inputSchema: {},
    },
    async () => {
      const result = await service.showBridgeStatus();
      return asToolResult('Current Codex Feishu bridge status.', result);
    },
  );

  server.registerTool(
    'start_feishu_bridge',
    {
      title: 'Start Feishu Bridge',
      description:
        'Start the local background daemon that listens for Feishu text messages.',
      inputSchema: {},
    },
    async () => {
      const result = await service.startBridge();
      return asToolResult('Started the Codex Feishu bridge daemon.', result);
    },
  );

  server.registerTool(
    'stop_feishu_bridge',
    {
      title: 'Stop Feishu Bridge',
      description:
        'Stop the local background daemon for the Feishu bridge.',
      inputSchema: {},
    },
    async () => {
      const result = await service.stopBridge();
      return asToolResult('Stopped the Codex Feishu bridge daemon.', result);
    },
  );

  server.registerTool(
    'list_feishu_bindings',
    {
      title: 'List Feishu Bindings',
      description:
        'List the current Feishu chat to Codex thread bindings stored by the bridge.',
      inputSchema: {},
    },
    async () => {
      const bindings = await service.listBindings();
      return asToolResult('Current Feishu bindings.', {
        bindings,
      });
    },
  );

  server.registerTool(
    'list_saved_codex_sessions',
    {
      title: 'List Saved Codex Sessions',
      description:
        'Read the local Codex session index and return the most recent saved sessions.',
      inputSchema: {
        limit: z
          .number()
          .int()
          .min(1)
          .max(50)
          .optional()
          .describe('Maximum number of sessions to return'),
      },
    },
    async ({ limit }) => {
      const sessions = await service.listSavedCodexSessions({ limit });
      return asToolResult('Recent saved Codex sessions.', {
        sessions,
      });
    },
  );

  server.registerTool(
    'run_text_message_demo',
    {
      title: 'Run Text Message Demo',
      description:
        'Simulate a single incoming Feishu text message against the current local bridge configuration.',
      inputSchema: {
        text: z.string().describe('The incoming Feishu text message'),
        chatId: z.string().optional().describe('Optional Feishu chat id'),
        messageId: z.string().optional().describe('Optional message id'),
        senderOpenId: z
          .string()
          .optional()
          .describe('Optional sender open id'),
      },
    },
    async (input) => {
      const result = await service.runTextMessageDemo(input);
      return asToolResult('Finished the local Feishu text-message demo.', result);
    },
  );

  return server;
}

async function main() {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
