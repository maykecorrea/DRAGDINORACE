import { useEffect, useState } from "react";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { DEFAULT_HOTKEYS, type Hotkeys } from "@/game/hotkeys";
import { useSave } from "@/game/use-save";
import { subscribeGarageReady } from "@/game/save";
import { HotkeyPad } from "@/components/hotkey-pad";

export function HotkeyGate() {
  const { user, isPending } = useCurrentUserState();
  const { save, commit } = useSave();
  const [ready, setReady] = useState(false);
  const [draft, setDraft] = useState<Hotkeys>(DEFAULT_HOTKEYS);

  useEffect(() => subscribeGarageReady(() => setReady(true)), []);

  useEffect(() => {
    setDraft(save.keys ?? DEFAULT_HOTKEYS);
  }, [save.keys]);

  if (!ready || isPending || !user || save.keysSet) return null;

  return (
    <div className="fixed inset-0 z-[70] overflow-y-auto bg-bg text-fg">
      <div className="mx-auto flex min-h-dvh max-w-lg flex-col px-4 py-8">
        <p className="text-xs font-semibold tracking-widest text-primary">ANTES DA FAIXA</p>
        <h1 className="font-display text-6xl leading-none">Escolhe os atalhos</h1>
        <p className="mt-3 text-sm text-pretty text-muted">
          Só aparece nesta primeira vez. A escolha fica salva na sua conta. Dá pra mudar depois em Conta, em Atalhos.
        </p>
        <div className="mt-5">
          <HotkeyPad value={draft} onChange={setDraft} />
        </div>
        <button
          type="button"
          onClick={() => commit({ ...save, keys: draft, keysSet: true })}
          className="mt-5 min-h-11 bg-primary px-4 font-display text-3xl leading-none text-ink"
        >
          Confirmar atalhos
        </button>
      </div>
    </div>
  );
}