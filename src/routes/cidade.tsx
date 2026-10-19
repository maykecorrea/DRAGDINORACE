import { createFileRoute } from "@tanstack/react-router";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { CityDrive } from "@/game/CityDrive";
import { cityGears } from "@/game/city";
import { liveStats } from "@/game/data";
import { topArt } from "@/game/forge";
import { selectedCar } from "@/game/save";
import { useSave } from "@/game/use-save";

export const Route = createFileRoute("/cidade")({
  component: Cidade,
});

function Cidade() {
  const { user, isPending } = useCurrentUserState();
  const { save, ready } = useSave();
  if (isPending || !ready) {
    return (
      <main className="grid min-h-dvh place-items-center bg-black">
        <p className="font-display text-4xl text-primary">...</p>
      </main>
    );
  }
  if (!user) return <RedirectToSignIn />;
  const car = selectedCar(save);
  const live = liveStats(car, save.pilot, save.kit);
  return (
    <CityDrive
      selfId={user.id}
      selfName={user.displayName || "Piloto"}
      topSrc={topArt(car)}
      pace={{ vmax: live.vmax, accel: live.accel, gears: cityGears(car.rarity) }}
    />
  );
}