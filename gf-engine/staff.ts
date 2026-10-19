import type { Content } from "./content.ts";
import { GameError } from "./errors.ts";
import { makeDebt, type GfEvent } from "./finance.ts";
import { addMorale } from "./morale.ts";
import { addRep } from "./reputation.ts";
import { chance, int } from "./rng.ts";
import { consumeMaterials } from "./stock.ts";
import type { EmployeeId, GameState, HiredEmployee, MaterialId, TheftEntry } from "./state.ts";

const IDS: EmployeeId[] = ["tico", "brasa", "osso_duro", "ambar", "zeca", "labia"];
const DISEASE_FROM = 12;
const DISEASE_P = 0.05;
const LATE_MORALE = -10;
const FIRE_MORALE = -5;
const QUIT_REP = -5;
export const TRAIN_COST = 300;
export const TRAIN_WEEKS = 8;

type EmployeeDef = Content["employees"][number];

function seq(state: GameState): number {
  const value = state.flags.seq;
  const next = (typeof value === "number" ? value : 0) + 1;
  state.flags.seq = next;
  return next;
}

function whole(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function defOf(content: Content, id: string): EmployeeDef | undefined {
  return content.employees.find((item) => item.id === id);
}

function isId(id: string): id is EmployeeId {
  return IDS.includes(id as EmployeeId);
}

export function produces(def: EmployeeDef): boolean {
  return (def.apPerDay ?? 0) > 0;
}

export function weeklyAp(state: GameState, content: Content): number {
  const days = content.balance.workDays;
  const crew = state.employees.reduce((sum, employee) => sum + employee.apPerDay * days, 0);
  return content.balance.apPerDay * days + crew;
}

function productionCount(state: GameState): number {
  return state.employees.filter((employee) => employee.apPerDay > 0).length;
}

function canAfford(state: GameState, amount: number): boolean {
  return state.cash - amount >= -state.overdraftLimit;
}

export function availableHires(state: GameState, content: Content): EmployeeDef[] {
  const hired = new Set(state.employees.map((employee) => employee.id));
  const room = productionCount(state) < state.garage.bays;
  return content.employees.filter((def) => {
    if (!def.enabled || hired.has(def.id as EmployeeId)) return false;
    if ((def.week ?? 0) > state.calendar.week) return false;
    if ((def.rep ?? 0) > state.rep) return false;
    if ((def.level ?? 0) > state.garage.level) return false;
    if (produces(def) && !room) return false;
    return true;
  });
}

function releaseJobs(state: GameState, id: EmployeeId): void {
  for (const job of state.jobs) {
    if (job.assignedTo === id) job.assignedTo = "teo";
  }
}

function hire(state: GameState, content: Content, action: Record<string, unknown>, events: GfEvent[]): void {
  const id = whole(action.employeeId);
  if (!id || !isId(id)) throw new GameError("sem_funcionario", "Essa pessoa não está na rua.");
  const def = defOf(content, id);
  if (!def || !def.enabled) throw new GameError("sem_funcionario", "Essa pessoa não está na rua.");
  if (state.employees.some((item) => item.id === id)) throw new GameError("sem_funcionario", "Essa pessoa já está na oficina.");
  if ((def.week ?? 0) > state.calendar.week || (def.rep ?? 0) > state.rep || (def.level ?? 0) > state.garage.level) {
    throw new GameError("sem_funcionario", "Essa pessoa ainda não está na porta.");
  }
  if (produces(def) && productionCount(state) >= state.garage.bays) {
    throw new GameError("sem_baia", "Não há baia para mais um braço de produção.");
  }
  if (!canAfford(state, def.salary)) throw new GameError("sem_caixa", "O cheque especial não cobre a taxa de contratação.");
  state.cash -= def.salary;
  const hired: HiredEmployee = {
    id,
    hiredWeek: state.calendar.week,
    salary: def.salary,
    skill: def.skill ?? 0,
    apPerDay: def.apPerDay ?? 0,
    owedWeeks: 0,
  };
  state.employees.push(hired);
  if (id === "ambar") state.flags.accountant = true;
  if (id === "zeca") state.flags.irregular_zeca = true;
  events.push({ type: "HIRED", text: id, amount: def.salary });
}

function fire(state: GameState, content: Content, action: Record<string, unknown>, events: GfEvent[]): void {
  const id = whole(action.employeeId);
  if (!id || !isId(id)) throw new GameError("sem_funcionario", "Essa pessoa não está na oficina.");
  const employee = state.employees.find((item) => item.id === id);
  if (!employee) throw new GameError("sem_funcionario", "Essa pessoa não está na oficina.");
  const cost = employee.salary * 2;
  if (!canAfford(state, cost)) throw new GameError("sem_caixa", "O cheque especial não cobre a rescisão.");
  state.cash -= cost;
  state.employees = state.employees.filter((item) => item.id !== id);
  releaseJobs(state, id);
  if (id === "ambar") state.flags.accountant = false;
  const hit = addMorale(state, content, FIRE_MORALE);
  events.push({ type: "FIRED", text: id, amount: cost });
  if (hit.collapsed) events.push({ type: "COLLAPSE", week: state.calendar.week });
}

function train(state: GameState, action: Record<string, unknown>, events: GfEvent[]): void {
  const id = whole(action.employeeId);
  if (id !== "tico") throw new GameError("sem_curso", "Só o Tico tem curso aberto.");
  const tico = state.employees.find((item) => item.id === "tico");
  if (!tico) throw new GameError("sem_funcionario", "O Tico não está na oficina.");
  if (tico.skill >= 2) throw new GameError("sem_curso", "O Tico já aprendeu o que o curso ensina.");
  if (typeof state.flags.ticoReadyWeek === "number") throw new GameError("sem_curso", "O curso já está andando.");
  if (!canAfford(state, TRAIN_COST)) throw new GameError("sem_caixa", "O curso custa 300. O caixa não fecha.");
  state.cash -= TRAIN_COST;
  state.flags.ticoReadyWeek = state.calendar.week + TRAIN_WEEKS;
  events.push({ type: "TRAINING", text: "tico", amount: TRAIN_COST, week: state.flags.ticoReadyWeek });
}

function payBack(state: GameState, action: Record<string, unknown>, events: GfEvent[]): void {
  const id = whole(action.employeeId);
  if (!id || !isId(id)) throw new GameError("sem_funcionario", "Essa pessoa não está na oficina.");
  const employee = state.employees.find((item) => item.id === id);
  if (!employee || employee.owedWeeks <= 0) throw new GameError("nada_devido", "Não há salário atrasado.");
  const cost = employee.salary * employee.owedWeeks;
  if (!canAfford(state, cost)) throw new GameError("sem_caixa", "O cheque especial não cobre o salário atrasado.");
  state.cash -= cost;
  employee.owedWeeks = 0;
  events.push({ type: "WAGES_PAID", text: id, amount: cost });
}

function quitForWage(state: GameState, content: Content, employee: HiredEmployee, events: GfEvent[]): void {
  const severance = employee.salary * 2;
  const debt = makeDebt(content, "rescisao", severance, state.calendar.week, { weeks: 4, dueWeek: state.calendar.week + 1 });
  debt.id = `rescisao-${seq(state)}`;
  debt.weeklyBps = 0;
  state.debts.push(debt);
  state.employees = state.employees.filter((item) => item.id !== employee.id);
  releaseJobs(state, employee.id);
  if (employee.id === "ambar") state.flags.accountant = false;
  addRep(state, content, QUIT_REP, "funcionário saiu por salário");
  events.push({ type: "QUIT", text: employee.id, amount: severance });
}

export function payWeeklySalaries(state: GameState, content: Content, events: GfEvent[]): number {
  let paid = 0;
  let missed = false;
  const leaving: HiredEmployee[] = [];
  for (const employee of state.employees) {
    const due = employee.salary * (1 + employee.owedWeeks);
    if (canAfford(state, due)) {
      state.cash -= due;
      paid += due;
      employee.owedWeeks = 0;
      continue;
    }
    employee.owedWeeks += 1;
    missed = true;
    if (employee.owedWeeks >= 2) leaving.push(employee);
  }
  if (missed) {
    const hit = addMorale(state, content, LATE_MORALE);
    if (hit.collapsed) events.push({ type: "COLLAPSE", week: state.calendar.week });
  }
  for (const employee of leaving) quitForWage(state, content, employee, events);
  return paid;
}

function readTheft(state: GameState): TheftEntry[] {
  const value = state.flags.zecaStolen;
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is TheftEntry => !!entry && typeof entry === "object" && "material" in entry);
}

/** O Zeca desvia estoque sem evento. A DRE mostra a diferença em perdas. */
export function divertStock(state: GameState, content: Content): number {
  const zeca = state.employees.find((item) => item.id === "zeca");
  if (!zeca) return 0;
  const rate = defOf(content, "zeca")?.theft ?? 0.05;
  const stocked = content.materials.map((item) => item.id).filter((id) => (state.inventory[id]?.qty ?? 0) > 0);
  if (stocked.length === 0) return 0;
  const material = stocked[int(state, 0, stocked.length - 1)]!;
  const qty = state.inventory[material]?.qty ?? 0;
  const steal = Math.min(qty, Math.max(1, Math.floor(qty * rate)));
  if (steal <= 0) return 0;
  const taken = consumeMaterials(state, content, material, steal);
  const log = readTheft(state);
  log.push({ week: state.calendar.week, material, qty: steal });
  state.flags.zecaStolen = log;
  const loss = state.flags.stockLossWeek;
  state.flags.stockLossWeek = (typeof loss === "number" ? loss : 0) + Math.round(taken.cost);
  return steal;
}

export function rollDisease(state: GameState, events: GfEvent[]): void {
  if (state.calendar.week < DISEASE_FROM) return;
  for (const employee of state.employees) {
    if (employee.sickUntilWeek != null && employee.sickUntilWeek > state.calendar.week) continue;
    if (!chance(state, DISEASE_P)) continue;
    employee.sickUntilWeek = state.calendar.week + 1;
    events.push({ type: "DOENCA", text: employee.id, week: state.calendar.week });
  }
}

export function applyTraining(state: GameState, events: GfEvent[]): void {
  const ready = state.flags.ticoReadyWeek;
  if (typeof ready !== "number" || state.calendar.week < ready) return;
  const tico = state.employees.find((item) => item.id === "tico");
  if (tico && tico.skill < 2) {
    tico.skill = 2;
    events.push({ type: "TRAINED", text: "tico" });
  }
  delete state.flags.ticoReadyWeek;
}

export function applyStaff(state: GameState, action: Record<string, unknown>, content: Content, events: GfEvent[]): boolean {
  const kind = String(action.type ?? "");
  if (kind === "HIRE") {
    hire(state, content, action, events);
    return true;
  }
  if (kind === "FIRE") {
    fire(state, content, action, events);
    return true;
  }
  if (kind === "TRAIN") {
    train(state, action, events);
    return true;
  }
  if (kind === "PAY_WAGES") {
    payBack(state, action, events);
    return true;
  }
  return false;
}
