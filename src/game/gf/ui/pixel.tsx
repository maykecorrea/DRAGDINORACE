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

const ALIAS: Record<string, string> = {
  "icon_divida.png": "/assets/gf/v2/hud/icon_divida_boleto.png",
  "icon_fossil.png": "/assets/gf/v2/hud/icon_fosseis.png",
  "icon_alerta.png": "/assets/gf/v2/ui/ui_selo_alerta.png",
  "icon_cadeado.png": "/assets/gf/v2/ui/ui_selo_alerta.png",
  "icon_relogio.png": "/assets/gf/v2/hud/hud_relogio_frame.png",
  "ui_telefone.png": "/assets/gf/v2/hud/btn_telefone.png",
  "ui_moldura_carta.png": "/assets/gf/v2/ui/ui_painel_9slice.png",
};

export function PixelFile({ file, className = "gf-ico" }: { file: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  const known = ALIAS[file];
  const src = known ?? (failed ? "/assets/gf/v2/hud/icon_fosseis.png" : `/assets/gf/${file}`);
  return <img className={className} src={src} alt="" onError={() => setFailed(true)} />;
}

export function Interior({ file }: { file: string }) {
  return <img className="gf-interior" src={`/assets/gf/map/interiores/${file}?v=1`} alt="" />;
}
