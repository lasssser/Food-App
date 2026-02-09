/**
 * Safe number formatting utility
 * Avoids toLocaleString() with locale args which crashes on Hermes/Android
 */
export function formatPrice(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '0';
  // Simple comma-separated formatting without locale-dependent APIs
  const parts = Math.round(n).toString().split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return parts.join('.');
}

export function formatPriceSYP(n: number | null | undefined): string {
  return `${formatPrice(n)} ل.س`;
}
