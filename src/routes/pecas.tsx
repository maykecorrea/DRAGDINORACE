import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CarShow, spinForNft } from "@/components/car-show";
import { BoughtModal } from "@/components/bought-modal";
import { MintRoulette, type SpinHaul } from "@/components/mint-roulette";
import { FossilWord } from "@/components/fossil-word";
import { PitFrame } from "@/components/pit";
import { liveStats, MINT_COST, rarityLabel } from "@/game/data";
import { forSale } from "@/game/prize";
import { loadSave, selectedCar } from "@/game/save";
import { kmh } from "@/game/raceConfig";
import { carArt, carLabel } from "@/game/forge";
import { PART_TIERS, TIER_COLOR, canWear, carRank, partArt, partById, partsOfTier, slotLabel, wearReason, xpBar, type PartSlot, type PartTier } from "@/game/parts";
import { PILOT_SLOTS, REAR_KINDS, WEAPON_KINDS, armArt, armById, armsOf, kindLabel, kitArt, kitById, kitsOf, pilotSlotLabel, wornLabel, type GunKind, type PilotSlot } from "@/game/armory";
import { useSave } from "@/game/use-save";
import { questSpins, useQuestSpin } from "@/game/quests.functions";

export const Route = createFileRoute("/pecas")({ component: Pecas });

function Pecas() {
  const { save, commit } = useSave();
  const car = selectedCar(save);
  const live = liveStats(car, save.pilot, save.kit);
  const [spin, setSpin] = useState<ReturnType<typeof spinForNft> | null>(null);
  const [tier, setTier] = useState<PartTier>("Comum");
  const [slot, setSlot] = useState<PartSlot | "Todos">("Todos");
  const [desk, setDesk] = useState<"pecas" | "armas" | "piloto">("pecas");
  const [kind, setKind] = useState<GunKind | "Todos">("Todos");
  const [face, setFace] = useState<"frontal" | "traseira">("frontal");
  const [pilotSlot, setPilotSlot] = useState<PilotSlot | "Todos">("Todos");
  const [bought, setBought] = useState<{ id: string; name: string; image?: string; kind: "part" | "arm" | "kit" } | null>(null);
  const [roulette, setRoulette] = useState(false);
  const [freeSpins, setFreeSpins] = useState(0);
  const bar = xpBar(car.xp ?? 0);
  const rank = carRank(car);
  const bin = save.bin ?? {};

  useEffect(() => {
    void questSpins().then((n) => setFreeSpins(Number(n) || 0)).catch(() => undefined);
  }, []);

  function buy(id: string) {
    const part = partById(id);
    const arm = armById(id);
    const kit = kitById(id);
    const itemTier = part?.tier ?? arm?.tier ?? kit?.tier;
    const cost = part?.cost ?? arm?.cost ?? kit?.cost;
    const name = part?.name ?? arm?.name ?? kit?.name;
    if (!itemTier || !name || cost === undefined || !forSale(itemTier) || !canWear(car, itemTier) || save.fossil < cost) return;
    const kind = part ? "part" : arm ? "arm" : "kit";
    const image = part ? partArt(part.id) : arm ? armArt(arm.id) : kit ? kitArt(kit.id) : undefined;
    commit({ ...save, fossil: save.fossil - cost, bin: { ...bin, [id]: (bin[id] ?? 0) + 1 } });
    setBought({ id, name, image, kind });
  }

  function equipBought() {
    if (!bought) return;
    if (bought.kind === "part") equip(bought.id);
    else if (bought.kind === "arm") equipArm(bought.id);
    else equipKit(bought.id);
    setBought(null);
  }

  function equip(id: string) {
    const part = partById(id);
    if (!part || (bin[id] ?? 0) < 1 || !canWear(car, part.tier)) return;
    const nextBin = { ...bin, [id]: (bin[id] ?? 0) - 1 };
    const prev = car.gear?.[part.slot];
    if (prev) nextBin[prev] = (nextBin[prev] ?? 0) + 1;
    const cars = save.cars.map((item) =>
      item.tokenId === car.tokenId ? { ...item, gear: { ...item.gear, [part.slot]: id } } : item,
    );
    commit({ ...save, bin: nextBin, cars });
  }

  function equipArm(id: string) {
    const piece = armById(id);
    if (!piece || (bin[id] ?? 0) < 1 || !canWear(car, piece.tier)) return;
    const nextBin = { ...bin, [id]: (bin[id] ?? 0) - 1 };
    if (piece.face === "traseira") {
      if (save.rearArm) nextBin[save.rearArm] = (nextBin[save.rearArm] ?? 0) + 1;
      commit({ ...save, bin: nextBin, rearArm: id, rear: piece.kind });
      return;
    }
    if (save.arm) nextBin[save.arm] = (nextBin[save.arm] ?? 0) + 1;
    commit({ ...save, bin: nextBin, arm: id, frontal: piece.kind });
  }

  function equipKit(id: string) {
    const piece = kitById(id);
    if (!piece || (bin[id] ?? 0) < 1 || !canWear(car, piece.tier)) return;
    const nextBin = { ...bin, [id]: (bin[id] ?? 0) - 1 };
    const prev = save.kit?.[piece.slot];
    if (prev) nextBin[prev] = (nextBin[prev] ?? 0) + 1;
    commit({ ...save, bin: nextBin, kit: { ...save.kit, [piece.slot]: id } });
  }

  return (
    <PitFrame bleed title="Peças">
      <video
        src="/game/pecas.mp4"
        autoPlay
        loop
        muted
        playsInline
        className="pointer-events-none absolute inset-0 h-full w-full object-cover"
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-black/25" />
      <section className="shop-scroll absolute inset-0 z-10 overflow-y-scroll px-3 pt-32 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-5">
        <div className="mx-auto w-full max-w-6xl" style={{ zoom: 0.7125 }}>
          <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
            <button type="button" className="flex items-center gap-3 text-left" onClick={() => setSpin(spinForNft(car))}>
              <img src={carArt(car)} alt="" className="h-16 w-24 object-contain drop-shadow-[0_8px_12px_rgba(0,0,0,0.8)]" />
              <span className="[text-shadow:0_1px_0_#000,0_0_8px_#000,0_2px_10px_rgba(0,0,0,0.95)]">
                <span className="block font-pixel text-[10px] tracking-[0.35em] text-[#d6ff3f]">Oficina</span>
                <span className="block font-display text-4xl leading-none text-white sm:text-5xl">{carLabel(car)}</span>
                <span className="mt-1 block text-xs text-white/70">
                  Nv. {bar.level} · rank {rarityLabel(rank)} · {kmh(live.vmax)} km/h · vida {Math.round(live.durability)}
                </span>
                <span className="mt-2 block h-2 w-48 bg-black/70">
                  <span className="block h-full bg-[#d6ff3f]" style={{ width: `${Math.max(8, Math.min(100, (live.durability / 320) * 100))}%` }} />
                </span>
                <span className="mt-1 block h-2 w-48 bg-white/15">
                  <span className="block h-full" style={{ width: `${Math.round((bar.into / bar.need) * 100)}%`, background: TIER_COLOR[rank] }} />
                </span>
              </span>
            </button>
          </div>
          <ul className="mb-3 flex gap-2 overflow-x-auto pb-1">
            {save.cars.map((nft) => {
              const on = nft.tokenId === car.tokenId;
              return (
                <li key={nft.tokenId} className="shrink-0">
                  <button
                    type="button"
                    onClick={() => commit({ ...save, selected: nft.tokenId })}
                    className={`grid h-16 w-20 place-items-center border bg-black/50 backdrop-blur-sm ${on ? "border-[#d6ff3f]" : "border-white/20"}`}
                  >
                    <img src={carArt(nft)} alt="" className="h-12 w-16 object-contain" />
                  </button>
                </li>
              );
            })}
          </ul>
          <p className="mb-2 text-xs text-white/90 [text-shadow:0_1px_0_#000,0_0_8px_#000,0_2px_10px_rgba(0,0,0,0.95)]">Cada corrida dá XP para este carro. A forja zera o nível: o carro novo começa do zero.</p>
          <div className="mb-2 flex gap-1 overflow-x-auto">
            {([
              ["pecas", "Peças"],
              ["armas", "Armas"],
              ["piloto", "Piloto"],
            ] as const).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setDesk(id)}
                className="min-h-11 shrink-0 border px-3 font-display text-3xl leading-none [text-shadow:0_1px_0_#000,0_0_8px_#000]"
                style={{ color: desk === id ? "#d6ff3f" : "#fff", borderColor: desk === id ? "#d6ff3f" : "transparent", background: "rgba(0,0,0,0.55)" }}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            type="button"
            disabled={save.fossil < MINT_COST && freeSpins < 1}
            onClick={() => setRoulette(true)}
            className="mb-2 min-h-11 bg-[#ff5a3c] px-3 font-display text-2xl leading-none text-black disabled:opacity-40"
          >
            {freeSpins > 0 ? `Ovo de itens · ${freeSpins} giro de missão` : `Ovo de itens · ${MINT_COST}`}
          </button>
          {desk === "pecas" && (
          <ul className="mb-2 flex gap-1 overflow-x-auto pb-1">
            {(["chassis", "engine", "tires", "nitro", "gearbox"] as const).map((slot) => {
              const fitted = partById(car.gear?.[slot] ?? "");
              const art = fitted ? partArt(fitted.id) : undefined;
              return (
                <li key={slot} className="min-w-[6.5rem] flex-1 border border-white/15 bg-black/55 px-2 py-1 text-center [text-shadow:0_1px_0_#000,0_0_6px_rgba(0,0,0,0.9)]">
                  <span className="block font-pixel text-[9px] tracking-widest text-white/50">{slotLabel(slot)}</span>
                  {art && <img src={art} alt="" className="mx-auto h-8 w-full object-contain" />}
                  <span className="block truncate font-display text-lg leading-none" style={{ color: fitted ? TIER_COLOR[fitted.tier] : "#fff" }}>
                    {fitted ? fitted.name : "Vazio"}
                  </span>
                </li>
              );
            })}
          </ul>
          )}
          {desk === "armas" && (
            <div className="mb-2 grid gap-1 sm:grid-cols-2">
              <p className="border border-white/15 bg-black/55 px-3 py-2 [text-shadow:0_1px_0_#000]">
                <span className="block font-pixel text-[10px] tracking-widest text-[#d6ff3f]">Frente</span>
                <span className="block font-display text-2xl leading-none text-white">{wornLabel(save.arm, save.frontal, "frontal")}</span>
              </p>
              <p className="border border-white/15 bg-black/55 px-3 py-2 [text-shadow:0_1px_0_#000]">
                <span className="block font-pixel text-[10px] tracking-widest text-[#ffb020]">Traseira</span>
                <span className="block font-display text-2xl leading-none text-white">{wornLabel(save.rearArm, save.rear, "traseira")}</span>
              </p>
            </div>
          )}
          {desk === "piloto" && (
            <ul className="mb-2 flex gap-1 overflow-x-auto pb-1">
              {PILOT_SLOTS.map((slotId) => {
                const fitted = kitById(save.kit?.[slotId] ?? "");
                return (
                  <li key={slotId} className="min-w-[6.5rem] flex-1 border border-white/15 bg-black/55 px-2 py-1 text-center [text-shadow:0_1px_0_#000]">
                    <span className="block font-pixel text-[9px] tracking-widest text-white/50">{pilotSlotLabel(slotId)}</span>
                    <span className="block truncate font-display text-lg leading-none" style={{ color: fitted ? TIER_COLOR[fitted.tier] : "#fff" }}>
                      {fitted ? fitted.name : "Vazio"}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
          <div className="mb-2 flex gap-1 overflow-x-auto">
            {PART_TIERS.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setTier(item)}
                className="min-h-11 shrink-0 border px-3 font-display text-2xl leading-none [text-shadow:0_1px_0_#000,0_0_8px_#000]"
                style={{ color: TIER_COLOR[item], borderColor: tier === item ? TIER_COLOR[item] : "transparent", background: "rgba(0,0,0,0.55)" }}
              >
                {item}
              </button>
            ))}
          </div>
          {desk === "pecas" && (
          <div className="mb-2 flex gap-1 overflow-x-auto">
            {(["Todos", "chassis", "engine", "tires", "nitro", "gearbox"] as const).map((item) => {
              const on = slot === item;
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => setSlot(item)}
                  className="min-h-11 shrink-0 border px-3 font-display text-2xl leading-none text-white [text-shadow:0_1px_0_#000,0_0_8px_#000]"
                  style={{ borderColor: on ? "#d6ff3f" : "transparent", background: "rgba(0,0,0,0.55)", color: on ? "#d6ff3f" : "#fff" }}
                >
                  {item === "Todos" ? "Todos" : slotLabel(item)}
                </button>
              );
            })}
          </div>
          )}
          {desk === "armas" && (
            <>
              <div className="mb-2 flex gap-1 overflow-x-auto">
                {(["frontal", "traseira"] as const).map((item) => {
                  const on = face === item;
                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() => {
                        setFace(item);
                        setKind("Todos");
                      }}
                      className="min-h-11 shrink-0 border px-3 font-display text-2xl leading-none [text-shadow:0_1px_0_#000,0_0_8px_#000]"
                      style={{ borderColor: on ? "#d6ff3f" : "transparent", background: "rgba(0,0,0,0.55)", color: on ? "#d6ff3f" : "#fff" }}
                    >
                      {item === "frontal" ? "Frente" : "Traseira"}
                    </button>
                  );
                })}
              </div>
              <div className="mb-2 flex gap-1 overflow-x-auto">
                {(["Todos", ...(face === "traseira" ? REAR_KINDS : WEAPON_KINDS)] as const).map((item) => {
                  const on = kind === item;
                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setKind(item)}
                      className="min-h-11 shrink-0 border px-3 font-display text-2xl leading-none text-white [text-shadow:0_1px_0_#000,0_0_8px_#000]"
                      style={{ borderColor: on ? "#d6ff3f" : "transparent", background: "rgba(0,0,0,0.55)", color: on ? "#d6ff3f" : "#fff" }}
                    >
                      {item === "Todos" ? "Todos" : kindLabel(item)}
                    </button>
                  );
                })}
              </div>
            </>
          )}
          {desk === "piloto" && (
            <div className="mb-2 flex gap-1 overflow-x-auto">
              {(["Todos", ...PILOT_SLOTS] as const).map((item) => {
                const on = pilotSlot === item;
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setPilotSlot(item)}
                    className="min-h-11 shrink-0 border px-3 font-display text-2xl leading-none text-white [text-shadow:0_1px_0_#000,0_0_8px_#000]"
                    style={{ borderColor: on ? "#d6ff3f" : "transparent", background: "rgba(0,0,0,0.55)", color: on ? "#d6ff3f" : "#fff" }}
                  >
                    {item === "Todos" ? "Todos" : pilotSlotLabel(item)}
                  </button>
                );
              })}
            </div>
          )}
          {desk === "pecas" && (
          <ul className="grid grid-cols-2 gap-2 lg:grid-cols-5">
            {partsOfTier(tier)
              .filter((part) => slot === "Todos" || part.slot === slot)
              .map((part) => {
              const owned = bin[part.id] ?? 0;
              const on = car.gear?.[part.slot] === part.id;
              const locked = wearReason(car, part.tier);
              const art = partArt(part.id);
              return (
                <li key={part.id} className="flex flex-col justify-between border border-white/20 bg-black/55 p-3 backdrop-blur-sm">
                  <span className="[text-shadow:0_1px_0_#000,0_0_6px_rgba(0,0,0,0.9)]">
                    {art && (
                      <span className="mb-2 flex h-44 w-full items-center justify-center overflow-hidden">
                        <img src={art} alt="" className="h-full w-full object-contain" />
                      </span>
                    )}
                    <span className="block font-pixel text-[10px] tracking-widest" style={{ color: TIER_COLOR[part.tier] }}>{slotLabel(part.slot)}</span>
                    <span className="mt-1 block font-display text-2xl leading-none text-white">{part.name}</span>
                    <span className="mt-1 block text-xs text-white/70">{part.blurb}</span>
                    <span className="mt-1 block text-xs text-white/50">Na caixa: {owned}</span>
                  </span>
                  <span className="mt-3 flex flex-col gap-1">
                    <button
                      type="button"
                      disabled={!forSale(part.tier) || !!locked || save.fossil < part.cost}
                      onClick={() => forSale(part.tier) && buy(part.id)}
                      className="min-h-11 bg-[#d6ff3f] px-2 font-display text-xl leading-none text-black disabled:opacity-40"
                    >
                      {!forSale(part.tier) ? "Só no ovo" : locked ? "Bloqueado" : save.fossil < part.cost ? "Faltam fósseis" : <>{part.cost} <FossilWord lime /></>}
                    </button>
                    <button
                      type="button"
                      disabled={on || owned < 1 || !!locked}
                      onClick={() => equip(part.id)}
                      className="min-h-11 border border-white/30 px-2 text-sm text-white disabled:opacity-40"
                    >
                      {on ? "Equipado" : locked && owned > 0 ? "Bloqueado" : "Equipar"}
                    </button>
                    {locked && <span className="text-[10px] leading-tight text-white/55">{locked}</span>}
                  </span>
                </li>
              );
            })}
          </ul>
          )}
          {desk === "armas" && (
            <ul className="grid grid-cols-2 gap-2 lg:grid-cols-5">
              {armsOf(tier, kind, face).map((piece) => {
                const owned = bin[piece.id] ?? 0;
                const on = piece.face === "traseira" ? save.rearArm === piece.id : save.arm === piece.id;
                const locked = wearReason(car, piece.tier);
                const art = armArt(piece.id);
                return (
                  <li key={piece.id} className="flex flex-col justify-between border border-white/20 bg-black/55 p-3 backdrop-blur-sm">
                    <span className="[text-shadow:0_1px_0_#000,0_0_6px_rgba(0,0,0,0.9)]">
                      {art && (
                        <span className="mb-2 flex h-44 w-full items-center justify-center overflow-hidden">
                          <img src={art} alt="" className="h-full w-full object-contain" />
                        </span>
                      )}
                      <span className="block font-pixel text-[10px] tracking-widest" style={{ color: TIER_COLOR[piece.tier] }}>{kindLabel(piece.kind)}</span>
                      <span className="mt-1 block font-display text-2xl leading-none text-white">{piece.name}</span>
                      <span className="mt-1 block text-xs text-white/70">{piece.blurb}</span>
                      <span className="mt-1 block text-xs text-white/50">Na caixa: {owned}</span>
                    </span>
                    <span className="mt-3 flex flex-col gap-1">
                      <button type="button" disabled={!forSale(piece.tier) || !!locked || save.fossil < piece.cost} onClick={() => forSale(piece.tier) && buy(piece.id)} className="min-h-11 bg-[#d6ff3f] px-2 font-display text-xl leading-none text-black disabled:opacity-40">
                        {!forSale(piece.tier) ? "Só no ovo" : locked ? "Bloqueado" : save.fossil < piece.cost ? "Faltam fósseis" : <>{piece.cost} <FossilWord lime /></>}
                      </button>
                      <button type="button" disabled={on || owned < 1 || !!locked} onClick={() => equipArm(piece.id)} className="min-h-11 border border-white/30 px-2 text-sm text-white disabled:opacity-40">
                        {on ? "Equipado" : locked && owned > 0 ? "Bloqueado" : "Equipar"}
                      </button>
                      {locked && <span className="text-[10px] leading-tight text-white/55">{locked}</span>}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
          {desk === "piloto" && (
            <ul className="grid grid-cols-2 gap-2 lg:grid-cols-5">
              {kitsOf(tier, pilotSlot).map((piece) => {
                const owned = bin[piece.id] ?? 0;
                const on = save.kit?.[piece.slot] === piece.id;
                const locked = wearReason(car, piece.tier);
                const art = kitArt(piece.id);
                return (
                  <li key={piece.id} className="flex flex-col justify-between border border-white/20 bg-black/55 p-3 backdrop-blur-sm">
                    <span className="[text-shadow:0_1px_0_#000,0_0_6px_rgba(0,0,0,0.9)]">
                      {art && (
                        <span className="mb-2 flex h-44 w-full items-center justify-center overflow-hidden">
                          <img src={art} alt="" className="h-full w-full object-contain" />
                        </span>
                      )}
                      <span className="block font-pixel text-[10px] tracking-widest" style={{ color: TIER_COLOR[piece.tier] }}>{pilotSlotLabel(piece.slot)}</span>
                      <span className="mt-1 block font-display text-2xl leading-none text-white">{piece.name}</span>
                      <span className="mt-1 block text-xs text-white/70">{piece.blurb}</span>
                      <span className="mt-1 block text-xs text-white/50">Na caixa: {owned}</span>
                    </span>
                    <span className="mt-3 flex flex-col gap-1">
                      <button type="button" disabled={!forSale(piece.tier) || !!locked || save.fossil < piece.cost} onClick={() => forSale(piece.tier) && buy(piece.id)} className="min-h-11 bg-[#d6ff3f] px-2 font-display text-xl leading-none text-black disabled:opacity-40">
                        {!forSale(piece.tier) ? "Só no ovo" : locked ? "Bloqueado" : save.fossil < piece.cost ? "Faltam fósseis" : <>{piece.cost} <FossilWord lime /></>}
                      </button>
                      <button type="button" disabled={on || owned < 1 || !!locked} onClick={() => equipKit(piece.id)} className="min-h-11 border border-white/30 px-2 text-sm text-white disabled:opacity-40">
                        {on ? "Equipado" : locked && owned > 0 ? "Bloqueado" : "Equipar"}
                      </button>
                      {locked && <span className="text-[10px] leading-tight text-white/55">{locked}</span>}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>
      {spin && <CarShow target={spin} onClose={() => setSpin(null)} />}
      {bought && <BoughtModal name={bought.name} image={bought.image} onEquip={equipBought} onLater={() => setBought(null)} />}
      {roulette && (
        <MintRoulette
          mode="part"
          fossil={save.fossil}
          credit={freeSpins}
          blocked={new Set()}
          onClose={() => setRoulette(false)}
          onHaul={(haul: SpinHaul) => {
            const current = loadSave();
            const covered = Math.min(haul.covered ?? 0, freeSpins);
            const cost = (haul.spins - covered) * MINT_COST;
            if (current.fossil < cost) return;
            const bin = { ...(current.bin ?? {}) };
            for (const drop of haul.gears) {
              if (drop.kind === "part" || drop.kind === "arm") bin[drop.id] = (bin[drop.id] ?? 0) + 1;
            }
            commit({ ...current, fossil: current.fossil - cost + haul.fossil, bin });
            if (covered > 0) {
              setFreeSpins((n) => Math.max(0, n - covered));
              void useQuestSpin({ data: { n: covered } })
                .then((res) => {
                  if (res.ok) setFreeSpins(res.left);
                })
                .catch(() => undefined);
            }
          }}
          onEquip={() => undefined}
          onEquipGear={(drop) => {
            if (drop.kind === "arm") equipArm(drop.id);
            else if (drop.kind === "part") equip(drop.id);
            setRoulette(false);
          }}
        />
      )}
    </PitFrame>
  );
}
