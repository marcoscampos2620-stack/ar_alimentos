/**
 * Formata um valor numérico para moeda brasileira (BRL).
 * Ex: 19582.50 → "R$ 19.582,50"
 */
export function formatCurrency(value: number | string): string {
  const num = typeof value === 'string' ? Number(value) : value;
  if (isNaN(num)) return 'R$ 0,00';
  return num.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
