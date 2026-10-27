import type { DebtTemplate } from "./content.ts";
import { bps, formatF } from "./format.ts";
import type { Debt, WeekSummary } from "./state.ts";

export type CascadeLine = {
  key: string;
  label: string;
  signed: number;
  tone: "in" | "out" | "base";
};

/** Caixa inicial → movimentos → caixa final. A soma fecha no `cashEnd` do servidor. */
export function cashCascade(summary: WeekSummary): { lines: CascadeLine[]; total: number } {
  const named =
    (summary.cashOpen ?? 0) +
    summary.received -
    summary.tax -
    summary.salaries -
    summary.fixed -
    summary.interest -
    summary.debtPaid -
    summary.materials;
  const open = summary.cashOpen ?? summary.cashEnd - named;
  const other = summary.cashEnd - (open + summary.received - summary.tax - summary.salaries - summary.fixed - summary.interest - summary.debtPaid - summary.materials);
  const lines: CascadeLine[] = [
    { key: "open", label: "Caixa inicial", signed: open, tone: "base" },
    { key: "received", label: "Recebido", signed: summary.received, tone: "in" },
    { key: "tax", label: "Imposto", signed: -summary.tax, tone: "out" },
    { key: "salaries", label: "Salários", signed: -summary.salaries, tone: "out" },
    { key: "fixed", label: "Contas fixas", signed: -summary.fixed, tone: "out" },
    { key: "interest", label: "Juros", signed: -summary.interest, tone: "out" },
    { key: "debts", label: "Parcelas", signed: -summary.debtPaid, tone: "out" },
    { key: "materials", label: "Peças", signed: -summary.materials, tone: "out" },
  ];
  if (other !== 0) lines.push({ key: "other", label: "Outros", signed: other, tone: other > 0 ? "in" : "out" });
  return { lines, total: lines.reduce((sum, line) => sum + line.signed, 0) };
}

export function breakEvenRevenue(summary: Pick<WeekSummary, "fixed" | "salaries" | "interest" | "materials">, taxBps: number): number {
  const cost = summary.fixed + summary.salaries + summary.interest + summary.materials;
  const keep = 1 - taxBps / 10000;
  if (keep <= 0) return cost;
  return Math.ceil(cost / keep);
}

export function seesCet(flags: Record<string, unknown>, lessons: readonly string[]): boolean {
  return flags.accountant === true || lessons.includes("L07");
}

export function formatBps(points: number): string {
  const pct = points / 100;
  const text = Number.isInteger(pct) ? String(pct) : pct.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
  return `${text.replace(".", ",")}%`;
}

export function formatRatio(ratio: number): string {
  if (!Number.isFinite(ratio)) return "—";
  const pct = ratio * 100;
  const rounded = Math.abs(pct) >= 100 ? Math.round(pct) : Math.round(pct * 10) / 10;
  const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  return `${text.replace(".", ",")}%`;
}

/** Taxa anunciada, ou o CET real (semana / mês / ano) quando a contadora ou a L07 liberam. */
export function debtRateLabel(debt: Pick<Debt, "weeklyBps">, template: DebtTemplate | undefined, cet: boolean): string {
  const real = cet && template?.anunciada && template.bps > debt.weeklyBps ? template.bps : debt.weeklyBps;
  if (!cet) return template?.anunciada ?? `${formatBps(debt.weeklyBps)} por semana`;
  const r = real / 10000;
  const month = (1 + r) ** 4.33 - 1;
  const year = (1 + r) ** 52 - 1;
  return `${formatBps(real)} / sem · ≈ ${formatRatio(month)} / mês · ≈ ${formatRatio(year)} / ano · CET`;
}

export type SimPoint = { week: number; balance: number; paid: number };

export type DebtSim = {
  never: boolean;
  weeks: number;
  totalPaid: number;
  points: SimPoint[];
  phrase: string;
};

function pointsOf(weeklyPercent: number): number {
  return Math.round(weeklyPercent * 100);
}

/** Mesma conta do motor: juros = round(saldo × bps / 10000), semana a semana. */
export function simulateDebt(principal: number, weeklyPercent: number, payment: number, horizon: number): DebtSim {
  const rate = pointsOf(weeklyPercent);
  const span = Math.max(1, Math.min(120, Math.round(horizon) || 1));
  const points: SimPoint[] = [];
  if (principal <= 0 || payment < 0) {
    return { never: false, weeks: 0, totalPaid: 0, points, phrase: "O valor não fecha." };
  }
  const first = bps(principal, rate);
  if (payment <= first) {
    let balance = principal;
    let paid = 0;
    for (let week = 1; week <= span; week += 1) {
      const interest = bps(balance, rate);
      balance += interest;
      const pay = Math.min(payment, balance);
      balance -= pay;
      paid += pay;
      points.push({ week, balance, paid });
    }
    return { never: true, weeks: 0, totalPaid: 0, points, phrase: "Não acaba nunca: você só paga juros" };
  }
  let balance = principal;
  let totalPaid = 0;
  let weeks = 0;
  while (balance > 0 && weeks < 600) {
    const interest = bps(balance, rate);
    if (payment <= interest) break;
    balance += interest;
    const pay = Math.min(payment, balance);
    balance -= pay;
    totalPaid += pay;
    weeks += 1;
    if (weeks <= span) points.push({ week: weeks, balance, paid: totalPaid });
  }
  return {
    never: false,
    weeks,
    totalPaid,
    points,
    phrase: `Pagando ${formatF(payment)} por semana você termina em ${weeks} semanas e paga ${formatF(totalPaid)} no total`,
  };
}

export type YieldSim = { balance: number; deposited: number; points: SimPoint[]; phrase: string };

export function simulateYield(principal: number, weeklyPercent: number, payment: number, horizon: number): YieldSim {
  const rate = pointsOf(weeklyPercent);
  const span = Math.max(1, Math.min(120, Math.round(horizon) || 1));
  if (principal < 0 || payment < 0) {
    return { balance: 0, deposited: 0, points: [], phrase: "O valor não fecha." };
  }
  let balance = principal;
  let deposited = principal;
  const points: SimPoint[] = [];
  for (let week = 1; week <= span; week += 1) {
    balance += bps(balance, rate) + payment;
    deposited += payment;
    points.push({ week, balance, paid: deposited });
  }
  return {
    balance,
    deposited,
    points,
    phrase: `Aplicando ${formatF(payment)} por semana, em ${span} semanas você tem ${formatF(balance)}`,
  };
}

export function installmentPitch(cost: number, markup: number, parts: number): { each: number; total: number } {
  const total = Math.round(cost * (1 + markup));
  const each = parts > 0 ? Math.ceil(total / parts) : total;
  return { each, total };
}

export function formatWeeks(value: number): string {
  if (!Number.isFinite(value)) return "∞";
  const rounded = Math.round(value * 10) / 10;
  return rounded.toFixed(1).replace(".", ",");
}
