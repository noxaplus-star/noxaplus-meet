let counter = 0;

export function createId(prefix = 'id'): string {
  counter += 1;
  const time = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 7);
  return `${prefix}-${time}-${counter.toString(36)}-${random}`;
}
