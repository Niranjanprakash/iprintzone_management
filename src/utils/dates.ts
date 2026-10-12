/** Format ISO date string to DD/MM/YYYY */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

/** Get today as ISO YYYY-MM-DD */
export function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

/** Get start of current week (Monday) as ISO */
export function weekStartISO(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split('T')[0];
}

/** Get start of current month as ISO */
export function monthStartISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

/** Validate ISO date string */
export function isValidDate(iso: string): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  return !isNaN(d.getTime()) && iso.match(/^\d{4}-\d{2}-\d{2}$/) !== null;
}

/** Parse DD/MM/YYYY to ISO YYYY-MM-DD */
export function parseDDMMYYYY(dmy: string): string {
  const parts = dmy.split('/');
  if (parts.length !== 3) return '';
  return `${parts[2]}-${parts[1]}-${parts[0]}`;
}

export function nowISO(): string {
  return new Date().toISOString();
}
