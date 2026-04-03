export function formatQty(value) {
  const number = Number(value ?? 0);
  return new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(number);
}

export function formatMoney(value) {
  const number = Number(value ?? 0);
  return new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(number);
}

export function formatNumber(value, digits = 0) {
  const number = Number(value ?? 0);
  return new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(number);
}

export function formatDateTime(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString("fr-FR");
}