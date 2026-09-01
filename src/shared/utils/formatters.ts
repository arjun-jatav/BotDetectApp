export function formatVolume(liters: number): string {
  return liters.toLocaleString();
}

export function formatPercentage(value: number, decimals: number = 1): string {
  return value.toFixed(decimals);
}
