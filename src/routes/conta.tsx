import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { UserButton } from "@/lib/auth/gates";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { FossilWord } from "@/components/fossil-word";
import { PitFrame } from "@/components/pit";
import { useSave } from "@/game/use-save";
import { DEFAULT_HOTKEYS } from "@/game/hotkeys";
import { HotkeyPad } from "@/components/hotkey-pad";
import type { GaugePref, StripPref } from "@/game/save";

export const Route = createFileRoute("/conta")({ component: Conta });

function Conta() {
  const user = useCurrentUser();
  const { save, commit } = useSave();
  const [callsign, setCallsign] = useState(save.callsign ?? "");

  useEffect(() => {
    setCallsign(save.callsign ?? "");
  }, [save.callsign]);

  return (
    <PitFrame title="Conta" kicker="CONFIGURAÇÃO">
      <div className="grid max-w-xl gap-4">
        <section className="border border-border bg-surface p-4">
          <p className="text-xs tracking-widest text-muted">PILOTO</p>
          <p className="mt-1 font-display text-4xl leading-none">{user?.displayName || "Sem nome"}</p>
          <p className="text-sm text-muted">{user?.primaryEmail}</p>
          <div className="mt-4">
            <UserButton />
          </div>
        </section>
        <form
          className="border border-border bg-surface p-4"
          onSubmit={(e) => {
            e.preventDefault();
            commit({ ...save, callsign: callsign.trim() });
          }}
        >
          <label className="grid gap-1 text-sm">
            Nome na faixa
            <input
              value={callsign}
              maxLength={18}
              onChange={(e) => setCallsign(e.target.value)}
              className="min-h-11 border border-border bg-bg px-3 text-fg"
              placeholder="Como o painel te chama"
            />
          </label>
          <button type="submit" className="mt-3 min-h-11 bg-primary px-4 font-display text-2xl leading-none text-ink">
            Salvar
          </button>
        </form>
        <section className="border border-border bg-surface p-4">
          <p className="text-xs tracking-widest text-muted">ATALHOS</p>
          <h2 className="mt-1 font-display text-4xl leading-none">Atalhos</h2>
          <p className="mt-2 text-sm text-pretty text-muted">
            Troca a tecla de cada comando. Se escolher uma que já está em uso, as duas trocam de lugar.
          </p>
          <div className="mt-3">
            <HotkeyPad
              value={save.keys ?? DEFAULT_HOTKEYS}
              onChange={(keys) => commit({ ...save, keys, keysSet: true })}
            />
          </div>
        </section>
        <section className="border border-border bg-surface p-4">
          <p className="text-xs tracking-widest text-muted">MAPA</p>
          <h2 className="mt-1 font-display text-4xl leading-none">Barra da corrida</h2>
          <p className="mt-2 text-sm text-pretty text-muted">
            A faixa de início e fim. O padrão é sólida. Pode deixar mais transparente ou tirar. Fica salvo na sua ficha.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {(
              [
                ["solid", "Sólida"],
                ["fade", "Transparente"],
                ["off", "Oculta"],
              ] as const
            ).map(([id, label]) => {
              const on = (save.strip ?? "solid") === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => commit({ ...save, strip: id satisfies StripPref })}
                  className={`min-h-11 border px-4 text-sm ${on ? "border-primary bg-primary text-ink" : "border-border text-fg"}`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </section>
        <section className="border border-border bg-surface p-4">
          <p className="text-xs tracking-widest text-muted">PAINEL</p>
          <h2 className="mt-1 font-display text-4xl leading-none">Velocímetro</h2>
          <p className="mt-2 text-sm text-pretty text-muted">
            O padrão é o mecânico, com agulha. O digital é opcional. Fica salvo na sua ficha.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {(
              [
                ["mech", "Mecânico"],
                ["digital", "Digital"],
              ] as const
            ).map(([id, label]) => {
              const on = (save.gauge ?? "mech") === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => commit({ ...save, gauge: id satisfies GaugePref })}
                  className={`min-h-11 border px-4 text-sm ${on ? "border-primary bg-primary text-ink" : "border-border text-fg"}`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </section>
        <section className="flex items-center justify-between gap-3 border border-border bg-surface p-4">
          <div>
            <p className="text-fg">Som do motor</p>
            <p className="text-sm text-muted">{save.muted ? "Mudo" : "Ligado"}</p>
          </div>
          <button
            type="button"
            onClick={() => commit({ ...save, muted: !save.muted })}
            className="min-h-11 border border-border px-4 text-sm"
          >
            {save.muted ? "Ligar" : "Mutar"}
          </button>
        </section>
        <p className="text-sm text-pretty text-muted">
          A garagem, o <FossilWord /> e as peças ficam nesta conta neste aparelho e no servidor da ficha. A cunhagem on-chain
          na Ronin ainda não dispara transação.
        </p>
      </div>
    </PitFrame>
  );
}
