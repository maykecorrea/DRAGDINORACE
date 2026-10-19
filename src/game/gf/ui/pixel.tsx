import { useState } from "react";

/** Nomes da lista de arte (GDD §15.2). A arte chega pronta; até lá o nome fica no lugar. */
export const GF = {
  rust: "icon_ferrugem.png",
  alert: "icon_alerta.png",
  lock: "icon_cadeado.png",
  clock: "icon_relogio.png",
  fossil: "icon_fossil.png",
  debt: "icon_divida.png",
  material: (id: string) => `icon_material_${id}.png`,
  supplier: (id: string) => `icon_fornecedor_${id}.png`,
  phone: "ui_telefone.png",
  cardFrame: "ui_moldura_carta.png",
};

export function PixelFile({ file, className = "gf-ico" }: { file: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <span className="gf-filechip">{file}</span>;
  return <img className={className} src={`/assets/gf/${file}`} alt="" onError={() => setFailed(true)} />;
}

export function Interior({ file }: { file: string }) {
  return <img className="gf-interior" src={`/assets/gf/map/interiores/${file}?v=1`} alt="" />;
}
