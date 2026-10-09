import { useEffect, useRef } from "react";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { loadGarage, saveGarage } from "@/game/garage.functions";
import { bindCloudPush, loadSave, markGarageReady, mergeSave, resetGarageReady, writeSave } from "@/game/save";

export function GarageSync() {
  const { user, isPending } = useCurrentUserState();
  const pulled = useRef<string | null>(null);

  useEffect(() => {
    if (isPending || !user) {
      if (!user) resetGarageReady();
      return;
    }
    if (pulled.current === user.id) return;
    pulled.current = user.id;
    loadGarage()
      .then((remote) => {
        const local = loadSave();
        if (!remote) {
          void saveGarage({ data: local }).catch(() => undefined);
          return;
        }
        const next = mergeSave(local, remote);
        writeSave(next);
        if (next.keysSet && !remote.keysSet) void saveGarage({ data: next }).catch(() => undefined);
      })
      .catch(() => undefined)
      .finally(() => markGarageReady());
  }, [user, isPending]);

  useEffect(() => {
    if (!user) {
      bindCloudPush(null);
      return;
    }
    bindCloudPush((save) => {
      void saveGarage({ data: save }).catch(() => undefined);
    });
    return () => bindCloudPush(null);
  }, [user]);

  return null;
}
