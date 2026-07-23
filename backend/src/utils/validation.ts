export const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parseOptionalYear(value: string | undefined): {
  valid: boolean;
  year: number | null;
} {
  if (value === undefined || value.trim() === '') {
    return { valid: true, year: null };
  }

  const normalized = value.trim();
  if (!/^\d{4}$/.test(normalized)) {
    return { valid: false, year: null };
  }

  const year = Number(normalized);
  return year >= 1900 && year <= 2100
    ? { valid: true, year }
    : { valid: false, year: null };
}
