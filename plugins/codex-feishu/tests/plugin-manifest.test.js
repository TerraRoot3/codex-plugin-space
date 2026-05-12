import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const pluginRoot = path.resolve(
  '/Users/hanbaokun/Documents/New project 2/plugins/codex-feishu',
);

const requiredFiles = [
  '.codex-plugin/plugin.json',
  '.mcp.json',
  '.app.json',
  'package.json',
  'README.md',
  '.env.example',
  'assets/.gitkeep',
];

test('plugin package contains required scaffold files', () => {
  for (const relativePath of requiredFiles) {
    const absolutePath = path.join(pluginRoot, relativePath);
    assert.equal(
      fs.existsSync(absolutePath),
      true,
      `expected ${relativePath} to exist`,
    );
  }
});

test('plugin manifest declares local MCP and app metadata', () => {
  const manifestPath = path.join(pluginRoot, '.codex-plugin/plugin.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

  assert.equal(manifest.name, 'codex-feishu');
  assert.equal(typeof manifest.version, 'string');
  assert.equal(manifest.mcpServers, './.mcp.json');
  assert.equal(manifest.apps, './.app.json');
  assert.equal(typeof manifest.interface.displayName, 'string');
});
