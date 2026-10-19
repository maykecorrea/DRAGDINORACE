import { useEffect, useState } from "react";
import { freshSave, loadSave, subscribeGarageReady, subscribeSave, writeSave, type Save } from "./save";

export function useSave() {
  const [save, setSave] = useState<Save>(freshSave);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const unsub = subscribeSave(setSave);
    const unready = subscribeGarageReady(() => {
      setSave(loadSave());
      setReady(true);
    });
    return () => {
      unsub();
      unready();
    };
  }, []);
  return { save, commit: writeSave, ready };
}