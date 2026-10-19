import { z } from "zod";

const amount = z.union([z.number(), z.string()]);

export type CardCond =
  | {
      stat: "cash" | "rep" | "morale" | "level" | "week" | "act" | "net_worth" | "total_debt" | "bays";
      lt?: number;
      lte?: number;
      gt?: number;
      gte?: number;
      eq?: number;
    }
  | { flag: string; eq: boolean | number | string }
  | { has_employee: string }
  | { has_debt: string }
  | { lesson_seen: string }
  | { hired_weeks: string; gte: number }
  | { any: CardCond[] }
  | { all: CardCond[] }
  | { not: CardCond };

export type CardEffect = {
  op:
    | "cash"
    | "rep"
    | "morale"
    | "debt_add"
    | "debt_pay"
    | "asset_remove"
    | "stock"
    | "flag"
    | "schedule"
    | "investment_add"
    | "employee_hire"
    | "employee_fire"
    | "lead_add"
    | "lesson"
    | "unlock"
    | "fixed_cost_add"
    | "fixed_cost_remove"
    | "ending"
    | "chance"
    | "debt_merge";
  value?: number | string | boolean;
  template?: string;
  principal?: number | string;
  weeks?: number;
  debt_id?: string;
  asset_id?: string;
  material?: "oleo" | "kit" | "chapa" | "cabo" | "osso" | "bobina";
  qty?: number | string;
  key?: string;
  in_days?: number;
  in_weeks?: number;
  card_id?: string;
  effects?: CardEffect[];
  hidden?: boolean;
  product?: string;
  scam_id?: string;
  id?: string;
  client_type?: string;
  hidden_type?: string;
  contract_template?: string;
  until_week?: number;
  growth_every_weeks?: number;
  growth_pct?: number;
  p?: number;
  otherwise?: CardEffect[];
};

export type CardOption = {
  id: string;
  label: string;
  requires: CardCond[];
  effects: CardEffect[];
  dodged_scam: boolean;
  scam: boolean;
  lesson_unlock?: string | null;
  decision_impact: number;
};

export type CardDef = {
  id: string;
  kind: "offer" | "event" | "story" | "memory" | "tutorial";
  npc: string | null;
  title: string;
  act_min: number;
  act_max: number;
  week_min: number;
  week_max: number;
  weight: number;
  once: boolean;
  cooldown_weeks: number;
  priority: number;
  blocking: boolean;
  conditions: CardCond[];
  text: string;
  red_flags: string[];
  options: CardOption[];
};

export const cardCondSchema: z.ZodType<CardCond> = z.lazy(() =>
  z.union([
    z
      .object({
        stat: z.enum(["cash", "rep", "morale", "level", "week", "act", "net_worth", "total_debt", "bays"]),
        lt: z.number().optional(),
        lte: z.number().optional(),
        gt: z.number().optional(),
        gte: z.number().optional(),
        eq: z.number().optional(),
      })
      .strict()
      .refine((cond) => [cond.lt, cond.lte, cond.gt, cond.gte, cond.eq].filter((item) => item != null).length === 1, "uma comparação"),
    z.object({ flag: z.string().min(1), eq: z.union([z.boolean(), z.number(), z.string()]) }).strict(),
    z.object({ has_employee: z.string().min(1) }).strict(),
    z.object({ has_debt: z.string().min(1) }).strict(),
    z.object({ lesson_seen: z.string().min(1) }).strict(),
    z.object({ hired_weeks: z.string().min(1), gte: z.number() }).strict(),
    z.object({ any: z.array(cardCondSchema).min(1) }).strict(),
    z.object({ all: z.array(cardCondSchema).min(1) }).strict(),
    z.object({ not: cardCondSchema }).strict(),
  ]),
);

const OPS = [
  "cash",
  "rep",
  "morale",
  "debt_add",
  "debt_pay",
  "asset_remove",
  "stock",
  "flag",
  "schedule",
  "investment_add",
  "employee_hire",
  "employee_fire",
  "lead_add",
  "lesson",
  "unlock",
  "fixed_cost_add",
  "fixed_cost_remove",
  "ending",
  "chance",
  "debt_merge",
] as const;

export const cardEffectSchema: z.ZodType<CardEffect> = z.lazy(() =>
  z
    .object({
      op: z.enum(OPS),
      value: z.union([z.number(), z.string(), z.boolean()]).optional(),
      template: z.string().min(1).optional(),
      principal: amount.optional(),
      weeks: z.number().int().positive().optional(),
      debt_id: z.string().min(1).optional(),
      asset_id: z.string().min(1).optional(),
      material: z.enum(["oleo", "kit", "chapa", "cabo", "osso", "bobina"]).optional(),
      qty: amount.optional(),
      key: z.string().min(1).optional(),
      in_days: z.number().int().positive().optional(),
      in_weeks: z.number().int().positive().optional(),
      card_id: z.string().min(1).optional(),
      effects: z.array(cardEffectSchema).optional(),
      hidden: z.boolean().optional(),
      product: z.string().min(1).optional(),
      scam_id: z.string().min(1).optional(),
      id: z.string().min(1).optional(),
      client_type: z.string().min(1).optional(),
      hidden_type: z.string().min(1).optional(),
      contract_template: z.string().min(1).optional(),
      until_week: z.number().int().nonnegative().optional(),
      growth_every_weeks: z.number().int().positive().optional(),
      growth_pct: z.number().optional(),
      p: z.number().min(0).max(1).optional(),
      otherwise: z.array(cardEffectSchema).optional(),
    })
    .strict()
    .superRefine((effect, ctx) => {
      const need = (ok: boolean, field: string) => {
        if (!ok) ctx.addIssue({ code: "custom", message: `falta ${field}`, path: [field] });
      };
      const numeric = effect.value == null || typeof effect.value === "number" || typeof effect.value === "string";
      if (effect.op === "cash" || effect.op === "rep" || effect.op === "morale") need(effect.value != null && numeric, "value");
      if (effect.op === "debt_add") {
        need(Boolean(effect.template), "template");
        need(effect.principal != null, "principal");
      }
      if (effect.op === "debt_pay") need(effect.value != null && numeric && Boolean(effect.debt_id || effect.template), "debt_id");
      if (effect.op === "asset_remove") need(Boolean(effect.asset_id), "asset_id");
      if (effect.op === "stock") {
        need(Boolean(effect.material), "material");
        need(effect.qty != null, "qty");
      }
      if (effect.op === "flag") need(Boolean(effect.key) && effect.value != null, "key");
      if (effect.op === "schedule") {
        need(effect.in_days != null || effect.in_weeks != null, "in_weeks");
        need(Boolean(effect.card_id) || (effect.effects?.length ?? 0) > 0, "effects");
      }
      if (effect.op === "investment_add") need(effect.value != null && numeric && Boolean(effect.product || effect.scam_id), "value");
      if (effect.op === "employee_hire" || effect.op === "employee_fire" || effect.op === "fixed_cost_remove") need(Boolean(effect.id), "id");
      if (effect.op === "lead_add") need(Boolean(effect.client_type), "client_type");
      if (effect.op === "lesson" || effect.op === "ending") need(Boolean(effect.id), "id");
      if (effect.op === "unlock") need(Boolean(effect.key), "key");
      if (effect.op === "chance") need(effect.p != null, "p");
      if (effect.op === "debt_merge") need(Boolean(effect.template), "template");
      if (effect.op === "fixed_cost_add") {
        need(Boolean(effect.id), "id");
        need(effect.value != null && numeric, "value");
      }
    }),
);

const optionSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  requires: z.array(cardCondSchema).default([]),
  effects: z.array(cardEffectSchema).default([]),
  dodged_scam: z.boolean().default(false),
  scam: z.boolean().default(false),
  lesson_unlock: z.string().min(1).nullable().optional(),
  decision_impact: z.number().int().default(0),
});

export const cardSchema = z
  .object({
    id: z.string().min(1),
    kind: z.enum(["offer", "event", "story", "memory", "tutorial"]),
    npc: z.string().min(1).nullable(),
    title: z.string().min(1),
    act_min: z.number().int().min(0).max(4).default(0),
    act_max: z.number().int().min(0).max(4).default(4),
    week_min: z.number().int().nonnegative().default(0),
    week_max: z.number().int().nonnegative().default(99),
    weight: z.number().nonnegative().default(10),
    once: z.boolean().default(false),
    cooldown_weeks: z.number().int().nonnegative().default(0),
    priority: z.number().int().nonnegative().default(0),
    blocking: z.boolean().default(false),
    conditions: z.array(cardCondSchema).default([]),
    text: z.string().min(1),
    red_flags: z.array(z.string().min(1)).default([]),
    options: z.array(optionSchema).min(2).max(3),
  })
  .superRefine((card, ctx) => {
    if (card.act_min > card.act_max) ctx.addIssue({ code: "custom", message: "ato invertido", path: ["act_max"] });
    if (card.week_min > card.week_max) ctx.addIssue({ code: "custom", message: "semana invertida", path: ["week_max"] });
    for (const flag of card.red_flags) {
      if (!card.text.includes(flag)) ctx.addIssue({ code: "custom", message: `red_flag ausente: ${flag}`, path: ["red_flags"] });
    }
    if (card.blocking && card.kind !== "event") ctx.addIssue({ code: "custom", message: "só evento bloqueia o dia", path: ["blocking"] });
  });

export function walkEffects(effects: CardEffect[], visit: (effect: CardEffect) => void): void {
  for (const effect of effects) {
    visit(effect);
    if (effect.effects) walkEffects(effect.effects, visit);
    if (effect.otherwise) walkEffects(effect.otherwise, visit);
  }
}
