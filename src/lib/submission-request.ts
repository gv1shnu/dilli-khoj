interface Pending {
  id: string;
  sql: string;
  ruin: number;
  version: string;
}
const memory = new Map<string, Pending>();
export function pendingSubmission(
  player: string,
  ruin: number,
  version: string,
  sql: string,
): Pending {
  const key = `dk_submission_${player}_${ruin}`;
  let prior = memory.get(key);
  try {
    prior =
      (JSON.parse(localStorage.getItem(key) ?? "null") as Pending | null) ??
      prior;
  } catch {
    /* memory fallback */
  }
  if (
    prior?.sql === sql &&
    prior.ruin === ruin &&
    prior.version === version &&
    /^[0-9a-f-]{36}$/.test(prior.id)
  )
    return prior;
  const pending = { id: crypto.randomUUID(), sql, ruin, version };
  memory.set(key, pending);
  try {
    localStorage.setItem(key, JSON.stringify(pending));
  } catch {
    /* in-memory retry remains possible */
  }
  return pending;
}
export function finishSubmission(player: string, ruin: number, id: string) {
  const key = `dk_submission_${player}_${ruin}`;
  if (memory.get(key)?.id === id) memory.delete(key);
  try {
    if (JSON.parse(localStorage.getItem(key) ?? "null")?.id === id)
      localStorage.removeItem(key);
  } catch {
    /* unavailable storage */
  }
}
