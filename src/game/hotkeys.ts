export const ACTIONS = ["gas", "left", "right", "shift", "nitro", "fire", "rear"] as const;

export type Action = (typeof ACTIONS)[number];

export type Hotkeys = Record<Action, string>;

export const ACTION_LABEL: Record<Action, string> = {
  gas: "Gás",
  left: "Faixa esquerda",
  right: "Faixa direita",
  shift: "Marcha",
  nitro: "Nitro",
  fire: "Tiro",
  rear: "Traseira",
};

export const DEFAULT_HOTKEYS: Hotkeys = {
  gas: "KeyW",
  left: "KeyA",
  right: "KeyD",
  shift: "ShiftLeft",
  nitro: "KeyN",
  fire: "KeyF",
  rear: "KeyG",
};

const NAMED: Record<string, string> = {
  Space: "Espaço",
  ShiftLeft: "Shift",
  ShiftRight: "Shift dir.",
  ControlLeft: "Ctrl",
  ControlRight: "Ctrl dir.",
  AltLeft: "Alt",
  AltRight: "Alt dir.",
  ArrowLeft: "←",
  ArrowRight: "→",
  ArrowUp: "↑",
  ArrowDown: "↓",
  Enter: "Enter",
  Backspace: "Backspace",
  Tab: "Tab",
};

export function validKeys(keys: unknown): keys is Hotkeys {
  if (!keys || typeof keys !== "object") return false;
  const value = keys as Hotkeys;
  const codes = ACTIONS.map((action) => value[action]);
  if (codes.some((code) => typeof code !== "string" || code.length < 1 || code.length > 32)) return false;
  return new Set(codes).size === codes.length;
}

export function readKeys(save: { keys?: Partial<Hotkeys> }): Hotkeys {
  const raw = save.keys;
  if (!raw || typeof raw !== "object") return DEFAULT_HOTKEYS;
  const fire = raw.fire ?? (Object.values(raw).includes("KeyF") ? "KeyQ" : "KeyF");
  const merged = { ...DEFAULT_HOTKEYS, ...raw, fire };
  return validKeys(merged) ? merged : DEFAULT_HOTKEYS;
}

export function keyLabel(code: string): string {
  if (NAMED[code]) return NAMED[code];
  if (code.startsWith("Key")) return code.slice(3);
  if (code.startsWith("Digit")) return code.slice(5);
  return code;
}

export function assignKey(current: Hotkeys, action: Action, code: string): Hotkeys {
  const next = { ...current, [action]: code };
  for (const other of ACTIONS) {
    if (other !== action && next[other] === code) next[other] = current[action];
  }
  return next;
}
