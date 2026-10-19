import { useState } from "react";
import { faceSrc } from "@/game/gf/clientes";
import { PORTRAIT } from "@/game/gf/stage";

export function Face({ id, salt, large = false }: { id: string; salt?: string; large?: boolean }) {
  const src = faceSrc(id, salt ?? id) ?? PORTRAIT[id] ?? `/assets/gf/npcs/${id}.png?v=2`;
  const file = src.split("/").pop()?.split("?")[0] ?? "retrato.png";
  const [failed, setFailed] = useState(false);
  const cls = large ? "gf-face gf-face-lg" : "gf-face";
  if (failed) return <span className={`${cls} gf-file`}>{file}</span>;
  return <img className={cls} src={src} alt="" width={large ? 64 : 36} height={large ? 64 : 36} onError={() => setFailed(true)} />;
}
