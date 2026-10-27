import { partsOf } from "./clock.ts";
import type { Content } from "./content.ts";
import { GameError } from "./errors.ts";
import type { GfEvent } from "./finance.ts";
import type { GameState } from "./state.ts";

export type FoodId =
  | "agua"
  | "cafe"
  | "sonho"
  | "pao"
  | "pastel"
  | "miojo"
  | "sacola"
  | "espeto"
  | "lanche"
  | "sopao"
  | "marmita"
  | "pf"
  | "panelada"
  | "caldo";

export type StallId = "padaria" | "feira" | "filtro" | "dimas" | "sopao";

export type FoodDef = {
  id: FoodId;
  nome: string;
  file: string;
  price: number;
  stall: StallId | null;
  hunger: number;
  thirst: number;
  energy: number;
  xp: number;
};

export type RecipeDef = {
  id: string;
  nome: string;
  out: FoodId;
  level: number;
  need: Partial<Record<FoodId, number>>;
};

export const FOODS: FoodDef[] = [
  { id: "agua", nome: "Água do filtro", file: "f_agua_filtro.png", price: 4, stall: "filtro", hunger: 0, thirst: 35, energy: 3, xp: 2 },
  { id: "cafe", nome: "Café coado", file: "f_cafe_coado.png", price: 8, stall: "padaria", hunger: 2, thirst: 8, energy: 10, xp: 3 },
  { id: "sonho", nome: "Sonho", file: "f_sonho.png", price: 6, stall: "padaria", hunger: 8, thirst: -2, energy: 5, xp: 3 },
  { id: "pao", nome: "Pão com ovo", file: "f_pao_ovo.png", price: 12, stall: "padaria", hunger: 18, thirst: -2, energy: 9, xp: 5 },
  { id: "pastel", nome: "Pastel da feira", file: "f_pastel_feira.png", price: 14, stall: "feira", hunger: 22, thirst: -4, energy: 11, xp: 5 },
  { id: "miojo", nome: "Miojo", file: "f_miojo.png", price: 8, stall: "feira", hunger: 12, thirst: -5, energy: 4, xp: 3 },
  { id: "sacola", nome: "Sacola da feira", file: "f_sacola_feira.png", price: 16, stall: "feira", hunger: 10, thirst: 4, energy: 0, xp: 1 },
  { id: "espeto", nome: "Espetinho", file: "f_espetinho.png", price: 18, stall: "dimas", hunger: 28, thirst: -3, energy: 14, xp: 7 },
  { id: "lanche", nome: "Lanche do Dimas", file: "f_lanche_raptor.png", price: 24, stall: "dimas", hunger: 38, thirst: -4, energy: 20, xp: 8 },
  { id: "sopao", nome: "Sopão", file: "f_sopao.png", price: 20, stall: "dimas", hunger: 30, thirst: 18, energy: 16, xp: 9 },
  { id: "marmita", nome: "Marmita", file: "f_marmita.png", price: 0, stall: null, hunger: 30, thirst: 15, energy: 16, xp: 16 },
  { id: "pf", nome: "Bone Special", file: "f_pf_osso.png", price: 0, stall: null, hunger: 52, thirst: 12, energy: 36, xp: 22 },
  { id: "panelada", nome: "Panelada", file: "f_panelada.png", price: 0, stall: null, hunger: 70, thirst: 22, energy: 52, xp: 30 },
  { id: "caldo", nome: "Caldo de osso", file: "f_caldo_osso.png", price: 0, stall: null, hunger: 36, thirst: 40, energy: 28, xp: 26 },
];

export const RECIPES: RecipeDef[] = [
  { id: "marmita", nome: "Marmita", out: "marmita", level: 0, need: { miojo: 1, agua: 1 } },
  { id: "caldo", nome: "Caldo de osso", out: "caldo", level: 1, need: { sacola: 1, agua: 1 } },
  { id: "pf", nome: "Bone Special", out: "pf", level: 2, need: { sacola: 1, miojo: 1 } },
  { id: "panelada", nome: "Panelada", out: "panelada", level: 3, need: { sacola: 1, espeto: 1 } },
];

export const LEVELS = [
  { level: 0, nome: "Lata", xp: 0, file: "nivel_lata.png" },
  { level: 1, nome: "Ferro", xp: 250, file: "nivel_ferro.png" },
  { level: 2, nome: "Bronze", xp: 700, file: "nivel_bronze.png" },
  { level: 3, nome: "Prata", xp: 1500, file: "nivel_prata.png" },
  { level: 4, nome: "Ouro", xp: 2800, file: "nivel_ouro.png" },
  { level: 5, nome: "Lenda", xp: 4500, file: "nivel_lenda.png" },
] as const;

const STALL_HOURS: Record<StallId, { from: number; to: number } | null> = {
  filtro: null,
  padaria: { from: 6 * 60, to: 19 * 60 },
  feira: { from: 7 * 60, to: 17 * 60 },
  dimas: { from: 11 * 60, to: 22 * 60 },
  sopao: { from: 11 * 60, to: 15 * 60 },
};

const BY_FOOD = new Map(FOODS.map((food) => [food.id, food]));

export function foodById(id: string): FoodDef | undefined {
  return BY_FOOD.get(id as FoodId);
}

export function foodsAt(stall: StallId): FoodDef[] {
  return FOODS.filter((food) => food.stall === stall);
}

export function stallOpen(stall: StallId, t: number): boolean {
  const hours = STALL_HOURS[stall];
  if (!hours) return true;
  const minute = t % 1440;
  return minute >= hours.from && minute < hours.to;
}

export function stallHours(stall: StallId): string {
  const hours = STALL_HOURS[stall];
  if (!hours) return "24h";
  const face = (minute: number) => `${String(Math.floor(minute / 60)).padStart(2, "0")}:00`;
  return `${face(hours.from)}–${face(hours.to)}`;
}

function num(flags: GameState["flags"], key: string, fallback: number): number {
  const value = flags[key];
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function hungerOf(state: GameState): number {
  return Math.max(0, Math.min(100, num(state.flags, "hunger", 35)));
}

export function thirstOf(state: GameState): number {
  return Math.max(0, Math.min(100, num(state.flags, "thirst", 30)));
}

export function xpOf(state: GameState): number {
  return Math.max(0, num(state.flags, "xp", 0));
}

export function levelOf(xp: number): (typeof LEVELS)[number] {
  let current: (typeof LEVELS)[number] = LEVELS[0];
  for (const row of LEVELS) {
    if (xp >= row.xp) current = row;
  }
  return current;
}

export function nextLevel(xp: number): (typeof LEVELS)[number] | null {
  return LEVELS.find((row) => row.xp > xp) ?? null;
}

export function readPantry(flags: GameState["flags"]): Partial<Record<FoodId, number>> {
  const raw = flags.pantry;
  if (typeof raw !== "string" || raw.length === 0) return {};
  const out: Partial<Record<FoodId, number>> = {};
  for (const part of raw.split(",")) {
    const [id, qty] = part.split(":");
    const count = Number(qty);
    if (foodById(id ?? "") && Number.isInteger(count) && count > 0) out[id as FoodId] = count;
  }
  return out;
}

function writePantry(state: GameState, bag: Partial<Record<FoodId, number>>): void {
  const text = FOODS.map((food) => [food.id, bag[food.id] ?? 0] as const)
    .filter(([, qty]) => qty > 0)
    .map(([id, qty]) => `${id}:${qty}`)
    .join(",");
  if (text) state.flags.pantry = text;
  else delete state.flags.pantry;
}

function take(bag: Partial<Record<FoodId, number>>, id: FoodId, qty: number): void {
  const have = bag[id] ?? 0;
  if (have < qty) throw new GameError("sem_comida", "Não tem isso na despensa.");
  bag[id] = have - qty;
}

function put(bag: Partial<Record<FoodId, number>>, id: FoodId, qty: number): void {
  bag[id] = (bag[id] ?? 0) + qty;
}

export function addPantry(state: GameState, id: FoodId, qty: number): void {
  if (qty <= 0) return;
  const bag = readPantry(state.flags);
  put(bag, id, qty);
  writePantry(state, bag);
}

export function medalFor(level: number): "bronze" | "prata" | "ouro" | null {
  if (level >= 4) return "ouro";
  if (level >= 3) return "prata";
  if (level >= 2) return "bronze";
  return null;
}

export function gainXp(state: GameState, amount: number, events: GfEvent[]): void {
  if (amount <= 0) return;
  const before = levelOf(xpOf(state)).level;
  state.flags.xp = xpOf(state) + amount;
  const after = levelOf(xpOf(state));
  if (after.level > before) {
    const medal = medalFor(after.level);
    if (medal) state.flags.medal = medal;
    events.push({ type: "LEVEL_UP", amount: after.level, text: after.nome });
  }
}

export function growAppetite(state: GameState, content: Content, hours: number, events: GfEvent[]): void {
  if (hours <= 0) return;
  tickBody(state, content, hours * 60, "awake", events);
}

/** Custo extra de 1 ponto de baia, fora das 3 horas acordado. */
export function applyWorkLoad(state: GameState, points: number): void {
  if (points <= 0) return;
  state.clock.energy = Math.max(0, state.clock.energy - 10 * points);
  state.flags.hunger = Math.min(100, hungerOf(state) + 6 * points);
  state.flags.thirst = Math.min(100, thirstOf(state) + 9 * points);
}

export function tickBody(state: GameState, content: Content, minutes: number, mode: "awake" | "sleep", events: GfEvent[]): { status: "ok" | "faint" | "knockout"; minutes: number } {
  const steps = Math.max(0, Math.round(minutes));
  for (let i = 0; i < steps; i += 1) {
    if (mode === "sleep") {
      state.clock.energy = Math.min(100, state.clock.energy + 8.5 / 60);
      state.flags.hunger = Math.min(100, hungerOf(state) + 1 / 60);
      state.flags.thirst = Math.min(100, thirstOf(state) + 1.5 / 60);
      if (hungerOf(state) < 50 && thirstOf(state) < 50) state.morale = Math.min(100, state.morale + 2.5 / 60);
    } else {
      state.clock.energy = Math.max(0, state.clock.energy - 4 / 60);
      state.flags.hunger = Math.min(100, hungerOf(state) + 4 / 60);
      state.flags.thirst = Math.min(100, thirstOf(state) + 5 / 60);
      if (hungerOf(state) >= 100) {
        state.clock.energy = Math.max(0, state.clock.energy - 2 / 60);
        if (drainHealth(state, content, 2 / 60, events)) return finish(state, "knockout", i + 1, events);
      }
      if (thirstOf(state) >= 100) {
        state.clock.energy = Math.max(0, state.clock.energy - 3 / 60);
        if (drainHealth(state, content, 3 / 60, events)) return finish(state, "knockout", i + 1, events);
      }
      if (state.clock.energy <= 0) return finish(state, "faint", i + 1, events);
    }
  }
  return finish(state, "ok", steps, events);
}

function finish(state: GameState, status: "ok" | "faint" | "knockout", minutes: number, events: GfEvent[]): { status: "ok" | "faint" | "knockout"; minutes: number } {
  const round = (value: number) => Math.round(value * 1000) / 1000;
  state.clock.energy = round(Math.max(0, Math.min(100, state.clock.energy)));
  state.flags.hunger = round(hungerOf(state));
  state.flags.thirst = round(thirstOf(state));
  state.morale = round(Math.max(0, Math.min(100, state.morale)));
  if (status === "ok") {
    const starving = hungerOf(state) >= 80 || thirstOf(state) >= 80;
    const day = `${state.calendar.week}-${state.calendar.day}`;
    if (starving && state.flags.starveDay !== day) {
      state.flags.starveDay = day;
      events.push({ type: "MEMORY", text: hungerOf(state) >= 80 ? "Téo está com fome." : "Téo está com sede." });
    }
  }
  return { status, minutes };
}

function drainHealth(state: GameState, content: Content, amount: number, events: GfEvent[]): boolean {
  if (amount <= 0 || state.morale <= 0) return false;
  const next = state.morale - amount;
  if (next > 0) {
    state.morale = next;
    return false;
  }
  state.morale = 50;
  state.clock.energy = 40;
  if (state.cash > 0) state.cash = Math.round(state.cash * 0.85);
  state.flags.district = "oficina";
  state.clock.t += 12 * 60;
  events.push({ type: "KNOCKOUT", text: "A saúde zerou. O resgate levou 12 horas e 15% dos fósseis." });
  void content;
  return true;
}

function needText(recipe: RecipeDef): string {
  return Object.entries(recipe.need)
    .map(([id, qty]) => `${qty} ${foodById(id)?.nome ?? id}`)
    .join(" e ");
}

export function applyBody(state: GameState, action: Record<string, unknown>, content: Content, events: GfEvent[]): boolean {
  const kind = String(action.type ?? "");
  if (kind === "BUY_FOOD") {
    const food = foodById(String(action.food ?? ""));
    if (!food || !food.stall) throw new GameError("comida_invalida", "Essa barraca não vende isso.");
    if (food.id !== "cafe" && !stallOpen(food.stall, state.clock.t)) {
      const p = partsOf(state.clock.t);
      throw new GameError("fechado", `A barraca abre ${stallHours(food.stall)}. Agora são ${String(p.hour).padStart(2, "0")}:${String(p.minute).padStart(2, "0")}.`);
    }
    if (state.cash < food.price) throw new GameError("sem_caixa", `${food.nome} custa ${food.price} fósseis.`);
    state.cash -= food.price;
    const bag = readPantry(state.flags);
    put(bag, food.id, 1);
    writePantry(state, bag);
    events.push({ type: "FOOD", text: food.id, amount: food.price });
    return true;
  }
  if (kind === "EAT") {
    const food = foodById(String(action.food ?? ""));
    if (!food) throw new GameError("comida_invalida", "Isso não está na despensa.");
    const bag = readPantry(state.flags);
    take(bag, food.id, 1);
    writePantry(state, bag);
    state.flags.hunger = Math.max(0, Math.min(100, hungerOf(state) - food.hunger));
    state.flags.thirst = Math.max(0, Math.min(100, thirstOf(state) - food.thirst));
    state.clock.energy = Math.min(content.time.energy.max, state.clock.energy + food.energy);
    events.push({ type: "ATE", text: food.id, amount: food.xp });
    return true;
  }
  if (kind === "COOK") {
    const district = state.flags.district;
    if (typeof district === "string" && district !== "oficina") throw new GameError("longe", "O fogão fica na Oficina Ferrugem & Filho.");
    const recipe = RECIPES.find((item) => item.id === String(action.recipe ?? ""));
    if (!recipe) throw new GameError("receita_invalida", "Essa receita não existe.");
    const bag = readPantry(state.flags);
    for (const [id, qty] of Object.entries(recipe.need)) {
      if ((bag[id as FoodId] ?? 0) < (qty ?? 0)) {
        throw new GameError("sem_comida", `Falta ingrediente: ${needText(recipe)}.`);
      }
    }
    const level = levelOf(xpOf(state)).level;
    if (level < recipe.level) throw new GameError("nivel_baixo", `${recipe.nome} pede o nível ${LEVELS[recipe.level]?.nome ?? recipe.level}.`);
    for (const [id, qty] of Object.entries(recipe.need)) take(bag, id as FoodId, qty ?? 0);
    put(bag, recipe.out, 1);
    writePantry(state, bag);
    events.push({ type: "COOKED", text: recipe.out, amount: 8 });
    return true;
  }
  return false;
}
