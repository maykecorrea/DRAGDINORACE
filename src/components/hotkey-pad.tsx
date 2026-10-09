import { useEffect, useState } from "react";
import { ACTION_LABEL, ACTIONS, assignKey, keyLabel, type Action, type Hotkeys } from "@/game/hotkeys";

export function HotkeyPad({ value, onChange }: { value: Hotkeys; onChange: (next: Hotkeys) => void }) {
  const [listen, setListen] = useState<Action | null>(null);

  useEffect(() => {
    if (!listen) return;
    const onKey = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.repeat) return;
      if (e.code === "Escape") {
        setListen(null);
        return;
      }
      onChange(assignKey(value, listen, e.code));
      setListen(null);
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [listen, onChange, value]);

  return (
    <ul className="grid gap-2">
      {ACTIONS.map((action) => {
        const armed = listen === action;
        return (
          <li key={action} className="flex items-center justify-between gap-3 border border-border bg-bg px-3 py-2">
            <span className="text-sm">{ACTION_LABEL[action]}</span>
            <button
              type="button"
              onClick={() => setListen(action)}
              className={`min-h-11 min-w-28 px-3 font-display text-2xl leading-none ${armed ? "bg-primary text-ink" : "border border-border text-fg"}`}
            >
              {armed ? "Aperta a tecla" : keyLabel(value[action])}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
