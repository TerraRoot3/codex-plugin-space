export function parseCommand(text) {
  if (typeof text !== 'string' || !text.startsWith('/')) {
    return null;
  }

  const trimmed = text.trim();
  const [rawName, ...args] = trimmed.slice(1).split(/\s+/);

  if (!rawName) {
    return null;
  }

  return {
    name: rawName,
    args,
  };
}
