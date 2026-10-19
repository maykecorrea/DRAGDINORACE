/** "1.200 ₣" / "−300 ₣". O sinal negativo é o menos tipográfico. */
export function formatF(n: number): string {
  const rounded = Math.round(n);
  const sign = rounded < 0 ? "−" : "";
  const digits = String(Math.abs(rounded));
  const parts: string[] = [];
  for (let i = digits.length; i > 0; i -= 3) parts.unshift(digits.slice(Math.max(0, i - 3), i));
  return `${sign}${parts.join(".")} ₣`;
}

export function bps(value: number, points: number): number {
  return Math.round((value * points) / 10000);
}
