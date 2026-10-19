import { PILOTS, type PilotId } from "./data";
import { rollWheel } from "./forge";
import { partArt, partsOfTier, type PartTier } from "./parts";
import { armArt, armsOf, kitArt, kitsOf } from "./armory";

export type GearDrop = {
  kind: "part" | "arm" | "kit" | "pilot";
  id: string;
  name: string;
  image: string;
  rarity: string;
};

export type GearHit = { kind: "fossil"; amount: number } | { kind: "gear"; drop: GearDrop };

function pick<T>(list: T[]): T {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return list[buf[0]! % list.length]!;
}

export function forSale(tier: string): boolean {
  return tier === "Comum" || tier === "Normal";
}

export function rollGear(mode: "part" | "pilot", ownedPilots: Set<string>): GearHit {
  const spin = rollWheel();
  if (spin.kind === "fossil") return { kind: "fossil", amount: spin.amount };
  const tier = spin.tier;
  if (mode === "part") {
    const from = (band: PartTier) => [
      ...partsOfTier(band).map((part) => ({
        kind: "part" as const,
        id: part.id,
        name: part.name,
        image: partArt(part.id) ?? "",
        rarity: part.tier,
      })),
      ...armsOf(band).map((piece) => ({
        kind: "arm" as const,
        id: piece.id,
        name: piece.name,
        image: armArt(piece.id) ?? "",
        rarity: piece.tier,
      })),
    ];
    const pool = from(tier);
    return { kind: "gear", drop: pick(pool.length ? pool : from("Comum")) };
  }
  const street = PILOTS.filter((pilot) => pilot.grade === "Rua" && !ownedPilots.has(pilot.id));
  const legend = PILOTS.filter((pilot) => pilot.grade === "Lendário" && !ownedPilots.has(pilot.id));
  if ((tier === "Comum" || tier === "Normal") && street.length) {
    const pilot = pick(street);
    return { kind: "gear", drop: { kind: "pilot", id: pilot.id, name: pilot.name, image: pilot.image, rarity: tier } };
  }
  if (tier === "Lendário" && legend.length) {
    const pilot = pick(legend);
    return { kind: "gear", drop: { kind: "pilot", id: pilot.id, name: pilot.name, image: pilot.image, rarity: tier } };
  }
  const kits = kitsOf(tier);
  const kit = pick(kits.length ? kits : kitsOf("Comum"));
  return { kind: "gear", drop: { kind: "kit", id: kit.id, name: kit.name, image: kitArt(kit.id) ?? "", rarity: kit.tier } };
}

export type OwnedPilot = PilotId;
