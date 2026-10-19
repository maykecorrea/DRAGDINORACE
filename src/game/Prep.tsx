import { useEffect, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { CarShow, spinForNft } from "@/components/car-show";
import { FossilWord } from "@/components/fossil-word";
import { PILOTS, liveStats, pilotById, resolveStats, type NftCar } from "./data";
import { carArt, carLabel } from "./forge";
import { driveMph, type AiLevel } from "./raceConfig";
import { bandStats, streetBuild, streetNear, STREET_PRIZE } from "./street";
import { armArt, ARMS, type ArmPiece } from "./armory";
import { canWear, wearReason } from "./parts";
import { FRONTAL, REAR, weaponRole, type WeaponId } from "./weapons";
import { ensureDaily, MISSIONS, type MissionId } from "./missions";
import type { Loadout, Save } from "./save";

type Face = "frontal" | "traseira";
type ShelfId = "car" | "front" | "rear" | "pilot";

function Shelf({
  label,
  title,
  detail,
  thumb,
  open,
  onToggle,
  children,
}: {
  label: string;
  title: string;
  detail: string;
  thumb?: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <div className={`border ${open ? "border-primary" : "border-border"}`}>
      <button type="button" onClick={onToggle} aria-expanded={open} className="flex w-full items-center gap-3 p-3 text-left">
        {thumb ? <img src={thumb} alt="" className="h-14 w-16 shrink-0 object-contain" /> : <span className="grid h-14 w-16 shrink-0 place-items-center border border-border text-xs text-muted">—</span>}
        <span className="min-w-0 flex-1">
          <span className="block text-xs tracking-widest text-muted">{label}</span>
          <span className="block truncate font-display text-3xl leading-none">{title}</span>
          <span className="mt-1 block truncate text-xs text-muted">{detail}</span>
        </span>
        <span className="shrink-0 font-pixel text-xs tracking-widest text-primary">{open ? "FECHAR" : "ABRIR"}</span>
      </button>
      {open && <div className="max-h-[46vh] overflow-y-auto border-t border-border p-3">{children}</div>}
    </div>
  );
}

function ownedPiece(save: Save, piece: ArmPiece): boolean {
  if ((save.bin?.[piece.id] ?? 0) > 0) return true;
  if (save.arm === piece.id || save.rearArm === piece.id) return true;
  return false;
}

export function Prep({
  save,
  ready,
  treino,
  onCommit,
  onRun,
  onStory,
  onPvp,
  onBet,
}: {
  save: Save;
  ready: boolean;
  treino?: boolean;
  onCommit: (next: Save) => void;
  onRun: () => void;
  onStory: () => void;
  onPvp: () => void;
  onBet: () => void;
}) {
  const [open, setOpen] = useState<ShelfId | null>(null);
  const [popped, setPopped] = useState<MissionId[]>([]);
  const [cash, setCash] = useState<MissionId | null>(null);
  const [spin, setSpin] = useState<ReturnType<typeof spinForNft> | null>(null);
  const car = save.cars.find((item) => item.tokenId === save.selected) ?? save.cars[0]!;
  const frontId = save.frontal ?? "mg";
  const rearId = save.rear ?? "tail";
  const frontPiece = ARMS.find((item) => item.id === save.arm);
  const rearPiece = ARMS.find((item) => item.id === save.rearArm);
  const frontName = frontPiece?.name ?? FRONTAL.find((item) => item.id === frontId)?.name ?? "Metralhadora";
  const rearName = rearPiece?.name ?? REAR.find((item) => item.id === rearId)?.name ?? "Cauda";

  function pickCar(next: NftCar) {
    onCommit({ ...save, selected: next.tokenId });
    setOpen(null);
  }

  function wear(piece: ArmPiece | null, slot: Face) {
    if (piece && !ownedPiece(save, piece)) return;
    if (piece && !canWear(car, piece.tier)) return;
    if (slot === "frontal") {
      onCommit({ ...save, frontal: (piece?.kind ?? "mg") as WeaponId, arm: piece?.id });
    } else {
      onCommit({ ...save, rear: (piece?.kind ?? "tail") as WeaponId, rearArm: piece?.id });
    }
    setOpen(null);
  }

  function apply(slot: number) {
    const pack = save.loadouts?.[slot];
    if (!pack || !save.cars.some((item) => item.tokenId === pack.car)) return;
    onCommit({
      ...save,
      selected: pack.car,
      frontal: pack.frontal,
      arm: pack.arm,
      rear: pack.rear,
      rearArm: pack.rearArm,
      pilot: pack.pilot,
    });
  }

  function remember(slot: number) {
    const next: (Loadout | null)[] = [...(save.loadouts ?? [null, null, null])];
    while (next.length < 3) next.push(null);
    next[slot] = { car: save.selected, frontal: save.frontal, arm: save.arm, rear: save.rear, rearArm: save.rearArm, pilot: save.pilot };
    onCommit({ ...save, loadouts: next });
  }

  function claim(id: MissionId) {
    const daily = ensureDaily(save);
    const spec = MISSIONS.find((item) => item.id === id);
    if (!spec || daily.claimed.includes(id)) return;
    if ((daily.done[id] ?? 0) < spec.target) return;
    setCash(id);
    window.setTimeout(() => setCash((cur) => (cur === id ? null : cur)), 900);
    onCommit({
      ...save,
      fossil: save.fossil + spec.reward,
      daily: { ...daily, claimed: [...daily.claimed, id] },
    });
  }

  const daily = ensureDaily(save);
  const pilot = save.pilot ? pilotById(save.pilot) : null;
  const carStats = liveStats(car, save.pilot, save.kit);

  function toggle(id: ShelfId) {
    setOpen((cur) => (cur === id ? null : id));
  }

  function weaponList(slot: Face) {
    const list = ARMS.filter((item) => item.face === slot);
    const chosen = slot === "frontal" ? save.arm : save.rearArm;
    return (
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <button type="button" onClick={() => wear(null, slot)} className="border border-primary p-2 text-left">
          <span className="block font-display text-2xl leading-none">{slot === "frontal" ? "Metralhadora" : "Cauda"}</span>
          <span className="block text-xs text-muted">Iniciante · {slot === "frontal" ? weaponRole(FRONTAL[0]!) : weaponRole(REAR[0]!)}</span>
        </button>
        {list.map((piece) => {
          const has = ownedPiece(save, piece);
          const locked = !has || !canWear(car, piece.tier);
          const why = !has ? "Não está na caixa. Compra em Peças." : wearReason(car, piece.tier);
          return (
            <button key={piece.id} type="button" disabled={locked} onClick={() => wear(piece, slot)} className={`border p-2 text-left disabled:opacity-40 ${chosen === piece.id ? "border-primary" : "border-border"}`}>
              {armArt(piece.id) && <img src={armArt(piece.id)} alt="" className="mb-1 h-16 w-full object-contain" />}
              <span className="block font-display text-xl leading-none">{piece.name}</span>
              <span className="block text-[11px] text-muted">{piece.weapon.damage} dano · {piece.weapon.clip} tiros · {weaponRole(piece.weapon)}</span>
              <span className="block text-[11px] text-muted">{piece.blurb}</span>
              {locked && why && <span className="mt-1 block text-[11px] text-danger">{why}</span>}
            </button>
          );
        })}
      </div>
    );
  }

  useEffect(() => {
    const key = `dino-daily-seen:${daily.day}`;
    let prev: Partial<Record<MissionId, number>> = {};
    try {
      prev = JSON.parse(sessionStorage.getItem(key) || "{}") as Partial<Record<MissionId, number>>;
    } catch {
      prev = {};
    }
    const hits: MissionId[] = [];
    const next: Partial<Record<MissionId, number>> = {};
    for (const mission of MISSIONS) {
      const have = daily.done[mission.id] ?? 0;
      const before = typeof prev[mission.id] === "number" ? prev[mission.id]! : 0;
      if (before < mission.target && have >= mission.target && !daily.claimed.includes(mission.id)) hits.push(mission.id);
      next[mission.id] = have;
    }
    if (hits.length === 0) {
      try {
        sessionStorage.setItem(key, JSON.stringify(next));
      } catch {
        /* private mode */
      }
      return;
    }
    setPopped(hits);
    const timer = window.setTimeout(() => {
      try {
        sessionStorage.setItem(key, JSON.stringify(next));
      } catch {
        /* private mode */
      }
      setPopped((cur) => cur.filter((id) => !hits.includes(id)));
    }, 1400);
    return () => window.clearTimeout(timer);
  }, [daily]);

  return (
    <section className="absolute inset-0 z-30 overflow-y-auto bg-black/55 p-3 sm:p-6">
      <div className="mx-auto w-full max-w-4xl border border-border bg-bg/95 p-4">
        <p className="font-pixel text-sm tracking-widest text-primary">{treino ? "TREINO" : "PREPARAÇÃO"}</p>
        {treino && <p className="mt-1 text-sm text-muted">Escolhe o set. START começa a pista.</p>}
        {!treino && (() => {
          const foe = streetNear(car.rarity, save.races ?? 0);
          const foeStats = bandStats(carStats, resolveStats(foe.driver, foe.rarity, streetBuild(foe.rarity), foe.id));
          const level: AiLevel = save.ai === "medio" || save.ai === "dificil" ? save.ai : "facil";
          const label = level === "dificil" ? "DIFÍCIL" : level === "medio" ? "MÉDIO" : "FÁCIL";
          return (
            <div className="mt-1">
              <p className="text-sm text-fg">
                Rival {foe.name} · {foe.rarity} · {Math.round(driveMph(foeStats.vmax))} mph · vida {Math.round(foeStats.durability)} · fóssil {STREET_PRIZE[foe.rarity]} · IA {label}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {(["facil", "medio", "dificil"] as const).map((id) => {
                  const name = id === "facil" ? "FÁCIL" : id === "medio" ? "MÉDIO" : "DIFÍCIL";
                  const on = level === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => onCommit({ ...save, ai: id })}
                      className={`min-h-11 border px-3 font-display text-2xl leading-none ${on ? "border-primary bg-primary text-ink" : "border-border text-fg"}`}
                    >
                      {name}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })()}
        <div className="mt-3 grid gap-2">
          <Shelf
            label="CARRO"
            title={carLabel(car)}
            detail={`${car.rarity} · ${Math.round(carStats.vmax)} mph · vida ${Math.round(carStats.durability)} · nitro ${carStats.nitroTime.toFixed(1)}s`}
            thumb={carArt(car)}
            open={open === "car"}
            onToggle={() => toggle("car")}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              {save.cars.map((item) => {
                const on = item.tokenId === car.tokenId;
                const stats = liveStats(item, save.pilot, save.kit);
                const label = carLabel(item);
                return (
                  <article key={item.tokenId} className={`flex gap-3 border p-3 ${on ? "border-primary" : "border-border"}`}>
                    <div className="flex w-32 shrink-0 flex-col">
                      <button type="button" onClick={() => pickCar(item)} className="text-left" aria-label={label}>
                        <img src={carArt(item)} alt="" className="h-20 w-full object-contain" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setSpin(spinForNft(item))}
                        aria-label={`Ver 3D de ${label}`}
                        className="mt-2 min-h-11 w-full border border-primary bg-primary/15 font-pixel text-base tracking-[0.2em] text-primary shadow-[0_0_12px_rgb(214_255_63/0.35)] transition hover:bg-primary hover:text-ink"
                      >
                        Ver 3D
                      </button>
                    </div>
                    <button type="button" onClick={() => pickCar(item)} className="min-w-0 flex-1 text-left">
                      <span className="block font-display text-3xl leading-none">{label}</span>
                      <span className="mt-1 block text-sm text-primary">{item.rarity}</span>
                      <span className="block text-xs text-muted">{Math.round(stats.vmax)} mph · vida {Math.round(stats.durability)} · nitro {stats.nitroTime.toFixed(1)}s</span>
                    </button>
                  </article>
                );
              })}
            </div>
          </Shelf>
          <Shelf
            label="FRENTE · F"
            title={frontName}
            detail={weaponRole(frontPiece?.weapon ?? FRONTAL[0]!)}
            thumb={frontPiece ? armArt(frontPiece.id) : undefined}
            open={open === "front"}
            onToggle={() => toggle("front")}
          >
            {weaponList("frontal")}
          </Shelf>
          <Shelf
            label="TRASEIRA · G"
            title={rearName}
            detail={weaponRole(rearPiece?.weapon ?? REAR[0]!)}
            thumb={rearPiece ? armArt(rearPiece.id) : undefined}
            open={open === "rear"}
            onToggle={() => toggle("rear")}
          >
            {weaponList("traseira")}
          </Shelf>
          <Shelf
            label="PILOTO"
            title={pilot ? pilot.name : "Sem piloto"}
            detail={pilot ? pilot.line : "Opcional. O carro corre do mesmo jeito."}
            thumb={pilot?.image}
            open={open === "pilot"}
            onToggle={() => toggle("pilot")}
          >
            <div className="grid gap-2 sm:grid-cols-2">
              <button type="button" onClick={() => { onCommit({ ...save, pilot: undefined }); setOpen(null); }} className={`border p-3 text-left ${save.pilot ? "border-border" : "border-primary"}`}>
                <span className="font-display text-3xl leading-none">Sem piloto</span>
                <span className="mt-1 block text-xs text-muted">Opcional. O carro corre do mesmo jeito.</span>
              </button>
              {PILOTS.map((crewPilot) => {
                const crew = save.pilots ?? [];
                const has = crewPilot.cost === 0 || crew.includes(crewPilot.id) || save.pilot === crewPilot.id;
                const on = save.pilot === crewPilot.id;
                return (
                  <button key={crewPilot.id} type="button" disabled={!has} onClick={() => { onCommit({ ...save, pilot: crewPilot.id }); setOpen(null); }} className={`flex items-center gap-3 border p-3 text-left disabled:opacity-40 ${on ? "border-primary" : "border-border"}`}>
                    <img src={crewPilot.image} alt="" className="h-16 w-16 object-contain" />
                    <span>
                      <span className="block font-display text-3xl leading-none">{crewPilot.name}</span>
                      <span className="block text-xs text-muted">{has ? crewPilot.line : "Contrata na Loja."}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </Shelf>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {[0, 1, 2].map((slot) => (
            <span key={slot} className="flex">
              <button type="button" onClick={() => apply(slot)} className="min-h-11 border border-border px-3 text-sm">
                Combo {slot + 1}{save.loadouts?.[slot] ? ` · ${carLabel(save.cars.find((item) => item.tokenId === save.loadouts?.[slot]?.car) ?? car)}` : ""}
              </button>
              <button type="button" onClick={() => remember(slot)} className="min-h-11 border border-border px-2 text-xs text-muted">gravar</button>
            </span>
          ))}
        </div>

        {treino && (
          <button type="button" disabled={!ready} onClick={onRun} className="mt-4 w-full min-h-14 bg-primary px-6 font-display text-4xl leading-none text-ink disabled:opacity-40">
            {ready ? "START" : "Carregando"}
          </button>
        )}

        {(save.races ?? 0) === 0 && (
          <p className="mt-3 text-sm text-muted">Primeira corrida: segura o gás e troca a marcha quando aparecer TROCA. O rival fica marcado com seta, FRENTE ou ATRÁS.</p>
        )}

        <div className="mt-4 border border-border p-3">
          <p className="text-xs tracking-widest text-muted">MISSÕES DE HOJE</p>
          <ul className="mt-2 grid gap-2">
            {MISSIONS.map((mission) => {
              const have = daily.done[mission.id] ?? 0;
              const done = have >= mission.target;
              const taken = daily.claimed.includes(mission.id);
              const pop = popped.includes(mission.id);
              const pct = Math.round((Math.min(have, mission.target) / mission.target) * 100);
              return (
                <li
                  key={mission.id}
                  className={`mission-row${done && !taken ? " is-ready" : ""}${taken ? " is-claimed" : ""}${pop ? " is-pop" : ""}`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm">
                      {mission.title}
                      <span className="text-muted"> · {Math.min(have, mission.target)}/{mission.target} · {mission.reward} fóssil</span>
                    </span>
                    {pop && <span className="mission-burst">FEITA</span>}
                    {cash === mission.id && <span className="mission-pay">+{mission.reward}</span>}
                    <button
                      type="button"
                      disabled={!done || taken}
                      onClick={() => claim(mission.id)}
                      className={`min-h-11 border px-3 text-sm disabled:opacity-40 ${done && !taken ? "border-primary bg-primary text-ink" : "border-border"}`}
                    >
                      {taken ? "Recolhida" : done ? "Recolher" : "Em curso"}
                    </button>
                  </div>
                  <span className="mission-meter" aria-hidden>
                    <span className="mission-meter-fill" style={{ width: `${pct}%` }} />
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {!treino && (
            <button type="button" disabled={!ready} onClick={onRun} className="min-h-14 bg-primary px-6 font-display text-4xl leading-none text-ink disabled:opacity-40">
              {ready ? "Correr" : "Carregando"}
            </button>
          )}
          <button type="button" className="min-h-11 border border-border px-3 font-display text-2xl leading-none" onClick={onStory}>História</button>
          <button type="button" className="min-h-11 border border-border px-3 font-display text-2xl leading-none" onClick={onPvp}>PvP</button>
          <button type="button" className="min-h-11 border border-border px-3 font-display text-2xl leading-none" onClick={onBet}>PvP aposta</button>
          <Link to="/dashboard" className="inline-flex min-h-11 items-center border border-border px-3 font-display text-2xl leading-none">Painel</Link>
          <span className="font-display text-2xl text-primary">{Math.floor(save.fossil).toLocaleString("pt-BR")} <FossilWord /></span>
        </div>
        <p className="mt-2 text-xs text-muted">No banco: {pilotById(save.pilot).name}. F atira na frente. G atira atrás.</p>
      </div>
      {spin && <CarShow target={spin} onClose={() => setSpin(null)} />}
    </section>
  );
}
