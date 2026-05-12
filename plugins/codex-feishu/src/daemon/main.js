import { runOneShot } from './runOneShot.js';
import { startLongConnection } from './startLongConnection.js';

function readEventJsonArgument(argv) {
  const eventIndex = argv.indexOf('--event-json');
  if (eventIndex === -1) {
    return null;
  }

  return argv[eventIndex + 1] ?? null;
}

async function main() {
  const rawEvent = readEventJsonArgument(process.argv);
  if (rawEvent) {
    const payload = JSON.parse(rawEvent);
    const result = await runOneShot({ payload });

    process.stdout.write(`${JSON.stringify(result)}\n`);
    return;
  }

  const runtime = await startLongConnection();
  const shutdown = async () => {
    if (runtime?.transport?.disconnect) {
      await runtime.transport.disconnect();
    }
    process.exit(0);
  };

  process.once('SIGINT', () => {
    void shutdown();
  });
  process.once('SIGTERM', () => {
    void shutdown();
  });
  process.stdout.write('codex-feishu long connection started\n');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
