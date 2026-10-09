import { useEffect, useState } from "react";
import { freshSave, loadSave, subscribeSave, writeSave, type Save } from "./save";

export function useSave() {
  const [save, setSave] = useState<Save>(freshSave);
  useEffect(() => {
    setSave(loadSave());
    return subscribeSave(setSave);
  }, []);
  return { save, commit: writeSave };
}
