/** Only suppress optional previews; an explicit play/click always works. */
export function shouldSkipMediaPreview(): boolean {
  const connection = (navigator as Navigator & {
    connection?: { saveData?: boolean; effectiveType?: string };
  }).connection;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
    Boolean(connection?.saveData) ||
    ['slow-2g', '2g', '3g'].includes(connection?.effectiveType ?? '');
}
