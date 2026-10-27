import type { ReactNode } from "react";

export type PhoneApp =
  | "home"
  | "zapdino"
  | "clientes"
  | "banco"
  | "pecas"
  | "mapa"
  | "caderno"
  | "saude"
  | "agenda"
  | "entrega"
  | "album"
  | "config";

const APPS: { id: PhoneApp; name: string; file: string }[] = [
  { id: "zapdino", name: "ZapDino", file: "app_zapdino.png" },
  { id: "clientes", name: "Clientes", file: "app_clientes.png" },
  { id: "mapa", name: "Mapa", file: "app_mapa.png" },
  { id: "agenda", name: "Agenda", file: "app_agenda.png" },
  { id: "entrega", name: "Entrega", file: "app_central_entrega.png" },
  { id: "config", name: "Ajustes", file: "app_config.png" },
];

const ART = "/assets/gf/v2/celular";

export function PhoneShell({
  app,
  badge,
  title,
  onOpen,
  onHome,
  onClose,
  children,
}: {
  app: PhoneApp;
  badge: Partial<Record<PhoneApp, number>>;
  title: string;
  onOpen: (app: PhoneApp) => void;
  onHome: () => void;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="gf-phone-modal" role="dialog" aria-modal="true" aria-label="Celular" onClick={onClose}>
      <div className="gf-phone-frame" onClick={(event) => event.stopPropagation()}>
        <img className="gf-phone-wall" src={`${ART}/papel_parede.png`} alt="" />
        <div className="gf-phone-screen">
          {app === "home" ? (
            <div className="gf-phone-home">
              {APPS.map((item) => {
                const n = badge[item.id] ?? 0;
                return (
                  <button key={item.id} type="button" className={`gf-phone-app${n > 0 ? " is-live" : ""}`} onClick={() => onOpen(item.id)}>
                    <span className="gf-phone-icon">
                      <img className={n > 0 ? "animate-gf-buzz motion-reduce:animate-none" : undefined} src={`${ART}/${item.file}`} alt="" />
                      {n > 0 && (
                        <span className="gf-phone-seal">
                          <img src={`${ART}/ui_selo.png`} alt="" />
                          <b>{n}</b>
                        </span>
                      )}
                    </span>
                    <span>{item.name}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="gf-phone-page">
              <button type="button" className="gf-phone-top" onClick={onHome}>
                <img src={`${ART}/ui_barra_topo.png`} alt="" />
                <b>Voltar</b>
                <strong>{title}</strong>
              </button>
              <div className="gf-phone-slot">
                <img className="gf-phone-panel" src={`${ART}/ui_painel.png?v=9`} alt="" />
                {children}
              </div>
            </div>
          )}
        </div>
        <img className="gf-phone-bezel" src={`${ART}/ui_telefone.png?v=10`} alt="" />
        <button type="button" className="gf-phone-x" aria-label="Fechar" onClick={onClose}>
          <img src="/assets/gf/v2/telas/tela_btn_fechar.png?v=19" alt="" />
        </button>
      </div>
    </div>
  );
}
