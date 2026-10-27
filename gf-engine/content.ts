import { z } from "zod";
import balanceJson from "../content/garagem-falida/v1/balance.json" with { type: "json" };
import carcassesJson from "../content/garagem-falida/v1/carcasses.json" with { type: "json" };
import cardsEventsJson from "../content/garagem-falida/v1/cards/events.json" with { type: "json" };
import cardsOffersJson from "../content/garagem-falida/v1/cards/offers.json" with { type: "json" };
import cardsStoryJson from "../content/garagem-falida/v1/cards/story.json" with { type: "json" };
import cardsTestJson from "../content/garagem-falida/v1/cards/_test.json" with { type: "json" };
import clientsJson from "../content/garagem-falida/v1/clients.json" with { type: "json" };
import debtsJson from "../content/garagem-falida/v1/debt_templates.json" with { type: "json" };
import employeesJson from "../content/garagem-falida/v1/employees.json" with { type: "json" };
import levelsJson from "../content/garagem-falida/v1/garage_levels.json" with { type: "json" };
import lessonsJson from "../content/garagem-falida/v1/lessons.json" with { type: "json" };
import materialsJson from "../content/garagem-falida/v1/materials.json" with { type: "json" };
import savingsJson from "../content/garagem-falida/v1/savings_products.json" with { type: "json" };
import servicesJson from "../content/garagem-falida/v1/services.json" with { type: "json" };
import suppliersJson from "../content/garagem-falida/v1/suppliers.json" with { type: "json" };
import timeJson from "../content/garagem-falida/v1/time.json" with { type: "json" };
import horariosJson from "../content/garagem-falida/v1/clientes-horarios.json" with { type: "json" };
import { cardSchema, walkEffects, type CardDef, type CardEffect } from "./cardSchema.ts";
import type { Act, MaterialId } from "./state.ts";

export class ContentError extends Error {
  readonly file: string;
  readonly field: string;

  constructor(file: string, field: string, message: string) {
    super(`${file}: ${field}: ${message}`);
    this.name = "ContentError";
    this.file = file;
    this.field = field;
  }
}

const materialId = z.enum(["kit", "oleo", "chapa", "cabo", "osso", "bobina"]);

const hm = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$|^24:00$/);
const hourWindow = z.object({
  dias: z.array(z.number().int().min(1).max(7)).min(1),
  de: hm,
  ate: hm,
}).passthrough();

const timeSchema = z.object({
  startT: z.number().int().nonnegative(),
  defaultSpeed: z.union([z.literal(1), z.literal(2), z.literal(4)]),
  speeds: z.array(z.union([z.literal(1), z.literal(2), z.literal(4)])).min(1),
  tickCapMs: z.number().int().positive(),
  wakeMinute: z.number().int().nonnegative(),
  refillMinute: z.number().int().nonnegative(),
  closeDay: z.number().int().min(1).max(7),
  closeMinute: z.number().int().nonnegative(),
  actions: z.record(z.string(), z.number().int().nonnegative()),
  travelPerPa: z.number().int().nonnegative(),
  energy: z.object({
    max: z.number().int().positive(),
    awakePerHour: z.number().int().nonnegative(),
    workExtra: z.number().int().nonnegative(),
    restBonus: z.number().int(),
    nightCoffee: z.number().int(),
    sleepBase: z.number().nonnegative(),
    sleepPerHour: z.number().nonnegative(),
    tired: z.number().int(),
    exhausted: z.number().int(),
    shortHours: z.number().positive(),
    shortAp: z.number().int().nonnegative(),
    shortMorale: z.number().int(),
    noSleepAp: z.number().int().nonnegative(),
    noSleepMorale: z.number().int(),
    faintHours: z.number().int().positive(),
    faintMorale: z.number().int(),
    walkFactor: z.number().positive(),
  }),
  nightShiftFrom: z.number().int().nonnegative(),
  nightShiftTo: z.number().int().nonnegative(),
  overtime: z.object({ extra: z.number(), night: z.number(), sunday: z.number(), maxPerWeek: z.number().int().positive() }),
  places: z.record(z.string(), z.array(hourWindow).min(1)),
  closedName: z.record(z.string(), z.string()),
  tints: z.array(z.object({ from: z.number().int(), to: z.number().int(), fase: z.string(), color: z.string(), opacity: z.number() })).min(1),
});

const horarioSchema = z.object({
  lugar: z.string().min(1),
  aparece: z.array(hourWindow).min(1),
  contato: z.object({ de: hm, ate: hm, responde_em_min: z.number().int().nonnegative() }),
  retirada: hourWindow.optional(),
  prazo_hora: hm.optional(),
  madrugada: z.boolean(),
  nota: z.string().optional(),
  nota_servidor: z.string().optional(),
}).passthrough();

const horariosFile = z.object({
  versao: z.union([z.string(), z.number()]),
  nota: z.string(),
  clientes: z.record(z.string(), horarioSchema),
});

const balanceSchema = z.object({
  apPerDay: z.number().int().positive(),
  workDays: z.number().int().positive(),
  nightShiftMaxPerWeek: z.number().int().nonnegative(),
  nightShiftMorale: z.number().int(),
  restAp: z.number().int().positive(),
  restMorale: z.number().int(),
  studyAp: z.number().int().positive(),
  studyMorale: z.number().int(),
  serviceRep: z.number().int().nonnegative(),
  overworkThreshold: z.number().int().positive(),
  overworkMorale: z.number().int(),
  sundayMorale: z.number().int(),
  sundayMoraleFromLevel: z.number().int().nonnegative(),
  sundayMoraleLevelBonus: z.number().int(),
  moraleMin: z.number().int(),
  moraleMax: z.number().int(),
  moraleAfterCollapse: z.number().int(),
  taxBps: z.number().int().nonnegative(),
  inventoryNetFactor: z.number(),
  receivableNetFactor: z.number(),
  savingsAutoMax: z.number().int().nonnegative(),
  fixed: z.object({
    districtBase: z.number().int(),
    districtPerLevel: z.number().int(),
    energyBase: z.number().int(),
    energyPerLevel: z.number().int(),
    maintenancePerLevel: z.number().int(),
    living: z.number().int(),
  }),
  fixedByLevel: z.array(z.number().int()).length(6),
  levelCosts: z.array(z.number().int()).length(5),
  failures: z.object({
    overdraft: z.number().int(),
    insolvency: z.number().int(),
    insolvencyWarn: z.number().int(),
    bankMissed: z.number().int().positive(),
    agiotaMissed: z.number().int().positive(),
    agiotaCharge: z.number().int().positive(),
    collapseWindow: z.number().int().positive(),
    collapseCount: z.number().int().positive(),
    dirtyMissed: z.number().int().positive(),
    cleanWeeks: z.number().int().positive(),
    cobrancaMorale: z.number().int(),
    campaignWeeks: z.number().int().positive(),
  }),
  gang: z.object({
    base: z.number().int().positive(),
    morale: z.number().int(),
    bumpBps: z.number().int(),
    every: z.number().int().positive(),
  }),
  leads: z.object({
    base: z.number().int(),
    repDiv: z.number().int().positive(),
    perLevel: z.number().int(),
    prospect: z.number().int(),
    prospectMaxWeek: z.number().int(),
    prospectCost: z.number().int(),
  }),
  contracts: z.object({
    priceMin: z.number().positive(),
    priceMax: z.number().positive(),
    latePct: z.number().nonnegative(),
    lateMax: z.number().nonnegative(),
    repOnTime: z.number().int(),
    repLate: z.number().int(),
    collectChance: z.number().min(0).max(1),
    collectShare: z.number().min(0).max(1),
    protestFee: z.number().int().nonnegative(),
    protestChance: z.number().min(0).max(1),
    protestWeeks: z.number().int().positive(),
    protestRep: z.number().int(),
    caloteRefuse: z.number().min(0).max(1),
    caloteRefuseDeposit: z.number().min(0).max(1),
    pechincheMax: z.number().positive(),
    pechincheStretch: z.number().positive(),
    pechincheStretchChance: z.number().min(0).max(1),
    deadlineMin: z.number().int().positive(),
    deadlineMax: z.number().int().positive(),
    expireDays: z.number().int().positive(),
    tutorialLeads: z.number().int().nonnegative(),
    checkCost: z.number().int().nonnegative(),
    checkAp: z.number().int().positive(),
    motoboyReturnDays: z.number().int().positive(),
    motoboyReturnChance: z.number().min(0).max(1),
    fleetWeekly: z.number().int().positive(),
    fleetJobs: z.number().int().positive(),
    fleetMinWeeks: z.number().int().positive(),
    fleetMaxWeeks: z.number().int().positive(),
    fleetMissFine: z.number().min(0).max(1),
    fleetPayWeeks: z.number().int().positive(),
    prospectAp: z.number().int().positive(),
    recordCalotes: z.number().int().nonnegative(),
  }),
  acceptance: z.object({
    base: z.number(),
    k: z.number(),
    repCenter: z.number(),
    repDiv: z.number(),
    depositPenalty: z.object({ "0": z.number(), "30": z.number(), "50": z.number(), "100": z.number() }),
    min: z.number(),
    max: z.number(),
  }),
  quality: z.object({
    base: z.number(),
    perSkill: z.number(),
    lowMoralePenalty: z.number(),
    lowMorale: z.number(),
    min: z.number(),
    max: z.number(),
    teoSkill: z.number(),
    reworkRep: z.number().int(),
    skillJobs: z.number().int().positive(),
    skillAfter: z.number().int(),
    rotWeeks: z.number().int().nonnegative(),
    rotRate: z.number().min(0).max(1),
  }),
  freedom: z.object({
    reserveWeeks: z.number().int().positive(),
    passiveIncome: z.number().int(),
    teoApMax: z.number().int(),
    teoApWeeks: z.number().int().positive(),
  }),
  acts: z.array(z.object({ from: z.number().int(), to: z.number().int(), act: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3), z.literal(4)]) })).min(1),
  inherited: z.array(z.object({ template: z.string().min(1), balance: z.number().int().positive(), dueWeek: z.number().int().optional() })).min(1),
  initial: z.object({
    cash: z.number().int(),
    rep: z.number().int(),
    morale: z.number().int(),
    garageLevel: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
    bays: z.number().int().positive(),
    overdraftLimit: z.number().int().positive(),
    paymentPriority: z.array(z.string()).length(5),
    inventory: z.array(z.object({ id: materialId, qty: z.number().int().positive(), cost: z.number().int().positive() })),
    heritageSource: z.literal("ferro_velho"),
    assets: z.array(z.object({ id: z.string(), name: z.string(), value: z.number().int().positive() })),
  }),
});

const materialSchema = z.object({ id: materialId, nome: z.string().min(1), icone: z.string().min(1), rots: z.boolean().optional() });
const priceMap = z.object({
  kit: z.number().int().nullable(),
  oleo: z.number().int().nullable(),
  chapa: z.number().int().nullable(),
  cabo: z.number().int().nullable(),
  osso: z.number().int().nullable(),
  bobina: z.number().int().nullable(),
});
const supplierSchema = z.object({
  id: z.string().min(1),
  nome: z.string().min(1),
  prices: priceMap,
  pagamento: z.string().min(1),
  qualityMod: z.number(),
  ap: z.number().int().nonnegative(),
  scrapBuy: z.number().optional(),
  creditDays: z.number().int().optional(),
  creditRep: z.number().int().optional(),
  creditLimit: z.number().int().optional(),
  installments: z.number().int().optional(),
  installmentMarkup: z.number().optional(),
  minOrder: z.record(z.string(), z.number().int()).optional(),
  defect: z.number().optional(),
  raidChance: z.number().optional(),
  raidFromPurchase: z.number().int().optional(),
  raidFine: z.number().int().optional(),
  raidRep: z.number().int().optional(),
});
const serviceSchema = z.object({
  id: z.string().min(1),
  nome: z.string().min(1),
  ap: z.number().int().positive(),
  difficulty: z.number().int().positive(),
  materials: z.partialRecord(materialId, z.number().int().positive()),
  ref: z.number().int().positive(),
  requires: z.object({ compressor: z.boolean().optional(), level: z.number().int().nonnegative().optional(), patent: z.number().int().nonnegative().optional() }),
});
const clientSchema = z.object({
  id: z.string().min(1),
  nome: z.string().min(1),
  actMin: z.number().int().nonnegative(),
  servicos: z.array(z.object({ id: z.string().min(1), peso: z.number().positive() })).min(1),
  pagamento: z.object({
    tipo: z.enum(["entrega", "split50_7d", "prazo"]),
    dias: z.number().int().positive().optional(),
  }),
  caloteBase: z.number().min(0).max(1),
  elasticidade: z.number().positive(),
  pesoPorAto: z.array(z.number()).length(5),
  falas: z.array(z.string().min(1)).min(3).max(5),
  hidden: z.boolean().optional(),
  enabled: z.boolean().optional(),
  disfarce: z.array(z.string()).optional(),
  desconto: z.number().optional(),
  urgencia: z.object({ dias: z.number().int(), preco: z.number(), retorno: z.number() }).optional(),
  requires: z.object({ level: z.number().int().optional(), rep: z.number().int().optional(), deposit: z.number().optional(), clean: z.boolean().optional() }).optional(),
  recusaSinal: z.object({ min: z.number(), chance: z.number() }).optional(),
});
const employeeSchema = z.object({
  id: z.string().min(1),
  nome: z.string().min(1),
  funcao: z.string().min(1),
  salary: z.number().int().nonnegative(),
  apPerDay: z.number().int().nonnegative().optional(),
  skill: z.number().int().nonnegative().optional(),
  week: z.number().int().optional(),
  rep: z.number().int().optional(),
  level: z.number().int().optional(),
  commission: z.number().optional(),
  leadBonus: z.number().int().optional(),
  skillBonus: z.record(z.string(), z.number().int()).optional(),
  error: z.number().optional(),
  theft: z.number().optional(),
  trap: z.boolean().optional(),
  enabled: z.boolean(),
  fala: z.string().min(1).optional(),
});
const debtSchema = z.object({
  creditor: z.string().min(1),
  group: z.enum(["agiota", "cartao", "banco", "fornecedor", "outras"]),
  bps: z.number().int().nonnegative(),
  min: z.enum(["fixed", "auto", "pct15", "interest", "price", "full"]),
  minValue: z.number().int().optional(),
  pct: z.number().optional(),
  limit: z.number().int().optional(),
  annuity: z.number().int().optional(),
  secured: z.boolean().optional(),
  weeks: z.number().int().optional(),
  minWeeks: z.number().int().optional(),
  maxWeeks: z.number().int().optional(),
  earlyPenaltyBps: z.number().int().optional(),
  penaltyBps: z.number().int().optional(),
  lateBps: z.number().int().optional(),
  dueWeek: z.number().int().optional(),
  requires: z.object({
    rep: z.number().int().optional(),
    clean: z.boolean().optional(),
    weeksClean: z.number().int().optional(),
    lessons: z.array(z.string()).optional(),
  }).optional(),
  anunciada: z.string().min(1).optional(),
});
const savingsSchema = z.object({
  id: z.enum(["cofrinho", "tesouro", "fundo"]),
  nome: z.string().min(1),
  bps: z.number().int(),
  liquidity: z.enum(["imediato", "proximo_fechamento"]),
  enabled: z.boolean(),
  range: z.tuple([z.number().int(), z.number().int()]).optional(),
  actMin: z.number().int().optional(),
});
const levelSchema = z.object({
  level: z.number().int().min(0).max(5),
  nome: z.string().min(1),
  cost: z.number().int().nonnegative(),
  repMax: z.number().int(),
  bays: z.number().int().positive(),
  unlocks: z.array(z.string()),
  moraleWeekly: z.number().int().optional(),
  priceMod: z.number().optional(),
  resaleMargin: z.number().optional(),
});
const carcassSchema = z.object({
  id: z.string().min(1),
  nome: z.string().min(1),
  buy: z.number().int().positive(),
  ap: z.number().int().positive(),
  material: z.number().int().nonnegative(),
  sell: z.tuple([z.number().int(), z.number().int()]),
  liquidity: z.number(),
  level: z.number().int(),
  enabled: z.boolean(),
});
const lessonSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  body: z.string().min(1),
  happened: z.string().min(1),
  plain: z.string().min(1),
  math: z.string().min(1),
  detect: z.string().min(1),
  instead: z.string().min(1),
});

export type Balance = z.infer<typeof balanceSchema>;
export type DebtTemplate = z.infer<typeof debtSchema>;
export type ServiceDef = z.infer<typeof serviceSchema>;
export type SupplierDef = z.infer<typeof supplierSchema>;
export type Content = {
  version: "v1";
  balance: Balance;
  materials: z.infer<typeof materialSchema>[];
  suppliers: SupplierDef[];
  services: ServiceDef[];
  clients: z.infer<typeof clientSchema>[];
  employees: z.infer<typeof employeeSchema>[];
  debtTemplates: Record<string, DebtTemplate>;
  savingsProducts: z.infer<typeof savingsSchema>[];
  garageLevels: z.infer<typeof levelSchema>[];
  carcasses: z.infer<typeof carcassSchema>[];
  lessons: z.infer<typeof lessonSchema>[];
  time: z.infer<typeof timeSchema>;
  horarios: Record<string, z.infer<typeof horarioSchema>>;
  cards: { offers: CardDef[]; events: CardDef[]; story: CardDef[] };
};

export function parseFile<T>(file: string, schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const issue = result.error.issues[0];
    throw new ContentError(file, issue?.path.join(".") || "(raiz)", issue?.message ?? "inválido");
  }
  return result.data;
}

function cardList(file: string, data: unknown): CardDef[] {
  return parseFile(file, z.array(cardSchema), data);
}

function devTestCards(): CardDef[] {
  const env = (import.meta as ImportMeta & { env?: { DEV?: boolean } }).env;
  if (env?.DEV !== true) return [];
  return cardList("cards/_test.json", cardsTestJson);
}

function bucketCards(cards: CardDef[]): Content["cards"] {
  return {
    offers: cards.filter((card) => card.kind === "offer"),
    events: cards.filter((card) => card.kind === "event"),
    story: cards.filter((card) => card.kind === "story" || card.kind === "memory" || card.kind === "tutorial"),
  };
}

export function lintCards(cards: CardDef[], content: Pick<Content, "debtTemplates" | "employees" | "materials" | "clients">): void {
  const seen = new Set<string>();
  for (const card of cards) {
    if (seen.has(card.id)) throw new ContentError("cards", card.id, "id repetido");
    seen.add(card.id);
    walkEffects(
      card.options.flatMap((option) => option.effects),
      (effect: CardEffect) => {
        if (effect.op === "debt_add" && effect.template && !content.debtTemplates[effect.template]) {
          throw new ContentError("cards", `${card.id}.template`, "modelo de dívida não existe");
        }
        if ((effect.op === "employee_hire" || effect.op === "employee_fire") && effect.id && !content.employees.some((item) => item.id === effect.id)) {
          throw new ContentError("cards", `${card.id}.id`, "funcionário não existe");
        }
        if (effect.op === "stock" && effect.material && !content.materials.some((item) => item.id === effect.material)) {
          throw new ContentError("cards", `${card.id}.material`, "material não existe");
        }
        if (effect.op === "lead_add" && effect.client_type && !content.clients.some((item) => item.id === effect.client_type)) {
          throw new ContentError("cards", `${card.id}.client_type`, "cliente não existe");
        }
      },
    );
  }
}

function crossCheck(content: Content): void {
  const materials = new Set(content.materials.map((item) => item.id));
  const services = new Set(content.services.map((item) => item.id));
  for (const service of content.services) {
    for (const material of Object.keys(service.materials)) {
      if (!materials.has(material as MaterialId)) {
        throw new ContentError("services.json", `${service.id}.materials.${material}`, "material não existe");
      }
    }
  }
  for (const client of content.clients) {
    for (const service of client.servicos) {
      if (!services.has(service.id)) throw new ContentError("clients.json", `${client.id}.servicos`, `serviço ${service.id} não existe`);
    }
  }
  for (const debt of content.balance.inherited) {
    if (!content.debtTemplates[debt.template]) {
      throw new ContentError("balance.json", `inherited.${debt.template}`, "modelo de dívida não existe");
    }
  }
  for (const supplier of content.suppliers) {
    for (const material of Object.keys(supplier.prices)) {
      if (!materials.has(material as MaterialId)) throw new ContentError("suppliers.json", `${supplier.id}.prices.${material}`, "material não existe");
    }
  }
  if (content.garageLevels.length !== 6) throw new ContentError("garage_levels.json", "(raiz)", "precisam ser 6 níveis");
  if (Object.keys(content.horarios).length !== 50) {
    throw new ContentError("clientes-horarios.json", "clientes", "precisam ser os 50 clientes");
  }
  lintCards([...content.cards.offers, ...content.cards.events, ...content.cards.story], content);
}

export function loadContent(files: {
  balance: unknown;
  materials: unknown;
  suppliers: unknown;
  services: unknown;
  clients: unknown;
  employees: unknown;
  debtTemplates: unknown;
  savingsProducts: unknown;
  garageLevels: unknown;
  carcasses: unknown;
  lessons: unknown;
  time: unknown;
  horarios: unknown;
  cards: { offers: unknown; events: unknown; story: unknown };
}): Content {
  const content: Content = {
    version: "v1",
    balance: parseFile("balance.json", balanceSchema, files.balance),
    materials: parseFile("materials.json", z.array(materialSchema).length(6), files.materials),
    suppliers: parseFile("suppliers.json", z.array(supplierSchema).min(1), files.suppliers),
    services: parseFile("services.json", z.array(serviceSchema).min(1), files.services),
    clients: parseFile("clients.json", z.array(clientSchema).min(1), files.clients),
    employees: parseFile("employees.json", z.array(employeeSchema).min(1), files.employees),
    debtTemplates: parseFile("debt_templates.json", z.record(z.string(), debtSchema), files.debtTemplates),
    savingsProducts: parseFile("savings_products.json", z.array(savingsSchema).min(1), files.savingsProducts),
    garageLevels: parseFile("garage_levels.json", z.array(levelSchema).length(6), files.garageLevels),
    carcasses: parseFile("carcasses.json", z.array(carcassSchema).min(1), files.carcasses),
    lessons: parseFile("lessons.json", z.array(lessonSchema), files.lessons),
    time: parseFile("time.json", timeSchema, files.time),
    horarios: parseFile("clientes-horarios.json", horariosFile, files.horarios).clientes,
    cards: bucketCards([
      ...cardList("cards/offers.json", files.cards.offers),
      ...cardList("cards/events.json", files.cards.events),
      ...cardList("cards/story.json", files.cards.story),
      ...devTestCards(),
    ]),
  };
  crossCheck(content);
  return content;
}

export const contentV1 = loadContent({
  balance: balanceJson,
  materials: materialsJson,
  suppliers: suppliersJson,
  services: servicesJson,
  clients: clientsJson,
  employees: employeesJson,
  debtTemplates: debtsJson,
  savingsProducts: savingsJson,
  garageLevels: levelsJson,
  carcasses: carcassesJson,
  lessons: lessonsJson,
  time: timeJson,
  horarios: horariosJson,
  cards: { offers: cardsOffersJson, events: cardsEventsJson, story: cardsStoryJson },
});

export const balance = contentV1.balance;

function stripServerNotes(value: unknown): unknown {
  if (Array.isArray(value)) return value.map((item) => stripServerNotes(item));
  if (!value || typeof value !== "object") return value;
  const out: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    if (key === "nota_servidor") continue;
    out[key] = stripServerNotes(item);
  }
  return out;
}

export const contentBody = JSON.stringify(stripServerNotes(contentV1));

export function supplierOf(content: Content, id: string): SupplierDef {
  const supplier = content.suppliers.find((item) => item.id === id);
  if (!supplier) throw new ContentError("suppliers.json", id, "fornecedor não existe");
  return supplier;
}

export function supplierPrice(content: Content, supplierId: string, material: MaterialId): number | null {
  return supplierOf(content, supplierId).prices[material];
}

export function serviceOf(content: Content, id: string): ServiceDef | undefined {
  return content.services.find((item) => item.id === id);
}

export function savingsBps(content: Content, id: "cofrinho" | "tesouro" | "fundo"): number {
  return content.savingsProducts.find((item) => item.id === id)?.bps ?? 0;
}

export function marginPerAp(content: Content, serviceId: string, supplierId = "casco_tech"): number {
  const service = serviceOf(content, serviceId);
  if (!service) throw new ContentError("services.json", serviceId, "serviço não existe");
  const supplier = supplierOf(content, supplierId);
  let cost = 0;
  for (const [material, qty] of Object.entries(service.materials)) {
    const price = supplier.prices[material as MaterialId];
    if (price == null) throw new ContentError("suppliers.json", `${supplierId}.${material}`, "não vende este material");
    cost += price * qty;
  }
  return Math.round((service.ref - cost) / service.ap);
}

export function actOf(week: number): Act {
  const row = balance.acts.find((item) => week >= item.from && week <= item.to);
  return row?.act ?? 4;
}
