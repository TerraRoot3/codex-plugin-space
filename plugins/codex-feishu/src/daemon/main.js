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

  await startLongConnection();
  process.stdout.write('codex-feishu long connection started\n');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
