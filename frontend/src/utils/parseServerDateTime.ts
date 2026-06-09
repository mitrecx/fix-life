/** Backend stores naive UTC; API JSON often omits the timezone suffix. */
export function parseServerDateTime(iso: string): Date {
  const raw = iso.trim();
  if (!raw) return new Date(Number.NaN);
  if (/[zZ]$/.test(raw) || /[+-]\d{2}:\d{2}$/.test(raw)) {
    return new Date(raw);
  }
  const normalized = raw.includes(" ") ? raw.replace(" ", "T") : raw;
  return new Date(`${normalized}Z`);
}
