const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** "2022-05-08" -> "8 May 2022". Locale-free so server and client agree. */
export function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

/** 7 -> "007" */
export function pad(n: number): string {
  return String(n).padStart(3, '0');
}
