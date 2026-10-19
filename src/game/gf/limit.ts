const hits = new Map<string, number[]>();

/** No máximo 10 ações por segundo por conta. */
export function takeActionSlot(accountId: string, now = Date.now()): boolean {
  const recent = (hits.get(accountId) ?? []).filter((at) => now - at < 1000);
  if (recent.length >= 10) {
    hits.set(accountId, recent);
    return false;
  }
  recent.push(now);
  hits.set(accountId, recent);
  return true;
}

export function resetActionSlots(): void {
  hits.clear();
}
