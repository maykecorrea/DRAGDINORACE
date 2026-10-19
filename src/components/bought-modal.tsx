export function BoughtModal({ name, image, onEquip, onLater }: { name: string; image?: string; onEquip: () => void; onLater: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4">
      <div className="pointer-events-none absolute left-1/2 top-1/3 size-56 -translate-x-1/2 -translate-y-1/2 animate-ping rounded-full bg-primary/25" />
      <div className="pointer-events-none absolute left-1/2 top-1/3 size-32 -translate-x-1/2 -translate-y-1/2 animate-ping rounded-full bg-[#ff4ad8]/30 [animation-delay:150ms]" />
      <div className="relative w-full max-w-md border border-primary bg-surface p-5 text-center shadow-[0_0_32px_rgba(214,255,63,0.25)]">
        <p className="font-pixel text-sm tracking-[0.35em] text-primary">COMPRA</p>
        <p className="mt-2 font-display text-4xl leading-none text-fg">Parabéns por comprar {name}.</p>
        {image && <img src={image} alt="" className="mx-auto mt-4 h-32 object-contain" />}
        <p className="mt-3 text-sm text-pretty">Gostaria de equipar?</p>
        <div className="mt-4 flex justify-center gap-2">
          <button type="button" onClick={onEquip} className="min-h-11 bg-primary px-4 font-display text-2xl leading-none text-ink">
            Equipar
          </button>
          <button type="button" onClick={onLater} className="min-h-11 border border-border px-4 font-display text-2xl leading-none">
            Depois
          </button>
        </div>
      </div>
    </div>
  );
}
