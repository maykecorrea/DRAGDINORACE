export type Day = 1 | 2 | 3 | 4 | 5 | 6 | 7;
export type Act = 0 | 1 | 2 | 3 | 4;
export type GarageLevel = 0 | 1 | 2 | 3 | 4 | 5;
export type MaterialId = "oleo" | "kit" | "chapa" | "cabo" | "osso" | "bobina";
export type SupplierId = "ferro_velho" | "casco_tech" | "megaosso" | "rato";
export type ClientType = "vizinho" | "motoboy" | "comerciante" | "pechincheiro" | "frota" | "corredor" | "caloteiro" | "prefeitura";
export type ServiceId = "oleo" | "reparo" | "funilaria" | "eletrica" | "motor" | "custom";
export type EmployeeId = "tico" | "brasa" | "osso_duro" | "ambar" | "zeca" | "labia";
export type EndingId = "falencia" | "peao" | "sobrevivencia" | "prosperidade" | "liberdade" | "abandoned";
export type FailureId = "F1_caixa" | "F2_banco" | "F3_insolvencia" | "F4_agiota" | "F5_desistencia";
export type Effect = {
  type?: string;
  op?: string;
  client?: string;
  amount?: number;
  receivableId?: string;
  leadId?: string;
  value?: number | string | boolean;
  template?: string;
  principal?: number | string;
  weeks?: number;
  debt_id?: string;
  asset_id?: string;
  material?: string;
  qty?: number | string;
  key?: string;
  in_days?: number;
  in_weeks?: number;
  card_id?: string;
  effects?: Effect[];
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
};

export interface Debt {
  id: string;
  template: string;
  creditor: string;
  principal: number;
  balance: number;
  weeklyBps: number;
  minPayment: number | "interest" | "pct15";
  installmentsLeft?: number;
  missed: number;
  secured: boolean;
  createdWeek: number;
  totalPaid: number;
  statement?: number;
  revolving?: number;
  dueWeek?: number;
  penaltyApplied?: boolean;
  pricePayment?: number;
  earlyPenaltyBps?: number;
  annuity?: number;
}

export interface Lead {
  id: string;
  apparentType: ClientType;
  hiddenType?: ClientType;
  service: ServiceId;
  refPrice: number;
  deadlineDays: number;
  quotes: string[];
  expiresDay: number;
  appearWeek?: number;
  appearDay?: number;
  status?: "open" | "pending" | "accepted" | "refused" | "counter" | "expired";
  counterPrice?: number;
  record?: string;
  revealed?: boolean;
  ficha?: ClientType;
  contractTemplate?: "frota_raptor";
  proposal?: { price: number; depositPct: 0 | 30 | 50 | 100; deadline: number; respondedAt?: number; accepted?: boolean; replyAt?: number };
}

export interface Job {
  id: string;
  leadId: string;
  service: ServiceId;
  price: number;
  depositPaid: number;
  apNeeded: number;
  apDone: number;
  assignedTo: "teo" | EmployeeId;
  handId?: string;
  yieldPct?: number;
  dueWeek: number;
  dueDay: number;
  status: "waiting_materials" | "queued" | "in_progress" | "ready" | "delivered" | "paid" | "defaulted";
  reworks: number;
  materialSource: SupplierId;
  clientType?: ClientType;
  payment?: "entrega" | "split50_7d" | "prazo";
  paymentDays?: number;
  materialCost?: number;
  contractId?: string;
  bornWeek?: number;
  pendingMaterials?: Partial<Record<MaterialId, number>>;
  usedRato?: boolean;
  qualityMod?: number;
}

export interface Receivable {
  id: string;
  jobId: string;
  value: number;
  dueWeek: number;
  dueDay: number;
  caloteRolled: boolean;
  status?: "open" | "paid" | "defaulted";
  clientType?: ClientType;
  collected?: boolean;
  protested?: boolean;
  sure?: boolean;
}

export interface InboundOrder {
  id: string;
  supplier: SupplierId;
  items: { material: MaterialId; qty: number; unitCost: number }[];
  foods?: { id: string; qty: number; unitCost: number }[];
  atWeek: number;
  atDay: number;
  /** Minuto do relógio em que o pedido saiu. Sem isso, o ícone estima um dia de viagem. */
  fromT?: number;
  /** Minuto em que a entrega do Tiozão chega. Sem isso, vale o dia marcado. */
  arriveT?: number;
  carrier?: "dinoturbo" | "dinodrone";
  /** Sorteado na saída. O pedido some no caminho e o dinheiro não volta. */
  lost?: boolean;
  freight?: number;
}

export interface FleetContract {
  id: string;
  template: "frota_raptor";
  startWeek: number;
  endWeek: number;
  weekly: number;
  perWeek: number;
  delivered: number;
  active: boolean;
}

export interface WeekSummary {
  week: number;
  revenue: number;
  received: number;
  tax: number;
  salaries: number;
  fixed: number;
  interest: number;
  debtPaid: number;
  materials: number;
  profit: number;
  cashEnd: number;
  /** Caixa na abertura da semana. Ausente em campanhas antigas. */
  cashOpen?: number;
  netWorth: number;
  totalDebt: number;
  teoAp: number;
  stockLoss: number;
}

export interface MaterialBatch {
  supplier: SupplierId;
  qty: number;
  unitCost: number;
  baseCost: number;
  ageWeeks: number;
  boughtWeek: number;
}

export interface StockLot {
  qty: number;
  avgCost: number;
  source: Partial<Record<SupplierId, number>>;
  ageWeeks: number;
  batches?: MaterialBatch[];
}

export interface HiredEmployee {
  id: EmployeeId;
  hiredWeek: number;
  salary: number;
  skill: number;
  apPerDay: number;
  owedWeeks: number;
  sickUntilWeek?: number;
}

export interface HandOffer {
  id: string;
  nome: string;
  yieldPct: number;
  salary: number;
  photo?: number;
}

export interface Hand {
  id: string;
  nome: string;
  yieldPct: number;
  salary: number;
  energy: number;
  energyMax: number;
  bay: number;
  out: "" | "doente" | "falta";
  excuse: string;
  advance: number;
  raise: boolean;
  daysWorked: number;
  pay: number;
  photo?: number;
}

export type RepEntry = { week: number; delta: number; reason: string };
export type TheftEntry = { week: number; material: MaterialId; qty: number };
export type FlagValue = boolean | number | string | RepEntry[] | TheftEntry[];

export interface QueuedCard {
  cardId: string;
  week: number;
  day: Day;
  opened: boolean;
  expiresWeek?: number;
  expiresDay?: Day;
}

export interface GameState {
  schema: 1;
  player: { name: string };
  calendar: {
    week: number;
    day: Day;
    act: Act;
    apLeft: number;
    extraNightsUsed: number;
    apWorkedThisWeek: number;
  };
  cash: number;
  overdraftLimit: number;
  rep: number;
  morale: number;
  collapses: number[];
  garage: { level: GarageLevel; bays: number; upgradingTo: number | null; hasCompressor: boolean; cameras: boolean };
  flags: Record<string, FlagValue>;
  assets: { id: string; name: string; value: number }[];
  inventory: Partial<Record<MaterialId, StockLot>>;
  debts: Debt[];
  savings: { cofrinho: number; tesouro: number; fundo: number; pendingWithdraw: { product: string; value: number }[]; autoDepositPct: number };
  scamInvestments: { id: string; scamId: string; principal: number; shownValue: number; week: number; status: "active" | "collapsed" | "locked" }[];
  employees: HiredEmployee[];
  hands?: Hand[];
  offers?: HandOffer[];
  leads: Lead[];
  jobs: Job[];
  receivables: Receivable[];
  contracts?: FleetContract[];
  inbound?: InboundOrder[];
  carcasses: { id: string; type: string; boughtFor: number; apLeft: number; hiddenDefect: boolean; inspected: boolean; listedPrice?: number; weeksListed: number }[];
  auctionLots?: { id: string; type: string; price: number; defect: boolean; revealed: boolean }[];
  fixedRecurring: { id: string; value: number; untilWeek?: number; growthEveryWeeks?: number; growthPct?: number; bornWeek?: number }[];
  paymentPriority: string[];
  scheduled: { atWeek: number; atDay: number; cardId?: string; effects?: Effect[]; source: string; hidden?: boolean }[];
  cardQueue: QueuedCard[];
  cardHistory: { cardId: string; option: string; week: number }[];
  cooldowns: Record<string, number>;
  failure: { redAlertWeeks: number; bankMissed: number; agiotaMissed: number };
  history: WeekSummary[];
  decisionsLog: { week: number; label: string; impact: number }[];
  lessonsTriggered: string[];
  ending: null | EndingId | FailureId;
  rngState: number;
  clock: {
    t: number;
    speed: 1 | 2 | 4;
    paused: boolean;
    energy: number;
    awakeSinceT: number;
    lastSleep: { from: number; to: number } | null;
    apRefillDay: number;
    awakeMin: number;
    subMs: number;
    overtime: { employeeId: string; cost: number }[];
  };
}
