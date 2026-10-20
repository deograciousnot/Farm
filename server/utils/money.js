/** "KES 5,000" */
export function formatKes(amount) {
  return `KES ${Math.round(amount).toLocaleString("en-KE")}`;
}
