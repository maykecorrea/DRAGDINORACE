import { useEffect, useState } from "react";

const ART = "/assets/gf/v2/pagamento";

export function PayModal({ amount, onClose }: { amount: number; onClose: () => void }) {
  const [frame, setFrame] = useState(1);
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setFrame((n) => (n % 4) + 1), 1000 / 12);
    return () => window.clearInterval(id);
  }, []);
  useEffect(() => {
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / 900);
      setShown(Math.round(amount * (1 - (1 - t) ** 3)));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [amount]);
  const coins = Array.from({ length: 18 }, (_, i) => i);
  return (
    <div className="gf-pay" role="dialog" aria-modal="true" aria-label="Pagamento recebido" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      {coins.map((i) => (
        <img
          key={i}
          className="gf-coin"
          src={`/assets/gf/v2/ui/ui_moedas_fx_${frame}.png?v=9`}
          alt=""
          style={{
            left: `${6 + ((i * 17) % 88)}%`,
            animationDelay: `${(i % 7) * 0.12}s`,
            animationDuration: `${1.6 + (i % 5) * 0.25}s`,
            width: i % 3 === 0 ? 42 : 26,
          }}
        />
      ))}
      <div className="gf-pay-card">
        <img className="gf-pay-rays" src={`${ART}/raios_brilho.png`} alt="" />
        <img className="gf-pay-plate" src={`${ART}/modal_pagamento.png`} alt="" />
        <p className="gf-pay-title">Pagamento recebido!</p>
        <p className="gf-pay-value">+₣ {shown.toLocaleString("pt-BR")}</p>
        <button type="button" onClick={onClose}>Beleza!</button>
      </div>
    </div>
  );
}
