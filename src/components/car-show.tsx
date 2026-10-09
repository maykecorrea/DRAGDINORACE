import { useEffect, useRef, useState } from "react";
import { loadForgeVideo } from "@/game/forge.functions";
import { carArt, carLabel, legendOf } from "@/game/forge";
import { driverById, type NftCar } from "@/game/data";

export type SpinTarget = {
  sprite?: number;
  name: string;
  car: string;
  tokenId?: string;
  poster?: string;
  video?: string;
  side?: string;
  pilot?: string;
};

export function spinForNft(nft: NftCar): SpinTarget {
  const driver = driverById(nft.driverId);
  const legend = legendOf(nft.exclusive?.image);
  if (legend) {
    return {
      name: legend.name,
      car: `Figurinha ${legend.no}`,
      video: legend.spin,
      poster: legend.car,
    };
  }
  return {
    sprite: driver.sprite,
    name: carLabel(nft),
    car: nft.exclusive ? "NFT exclusivo" : driver.car,
    tokenId: nft.exclusive ? nft.tokenId : undefined,
    poster: carArt(nft),
  };
}

function loadHtmlImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("imagem"));
    img.src = src;
  });
}

function paintTurn(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, boxW: number, boxH: number, turn: number) {
  const c = Math.cos(turn);
  const flip = c < 0 ? -1 : 1;
  const squash = Math.max(0.14, Math.abs(c));
  const dw = boxW * squash;
  const dh = boxH;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(flip, 1);
  if (squash < 0.22) {
    ctx.fillStyle = "#1a1c16";
    ctx.fillRect(-10, -dh / 2, 20, dh);
  }
  ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
  ctx.restore();
}

function DualSpin({ car, pilot }: { car: string; pilot: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    let live = true;
    let raf = 0;
    void Promise.all([loadHtmlImage(car), loadHtmlImage(pilot)]).then(([machine, rider]) => {
      if (!live) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.imageSmoothingEnabled = false;
      const t0 = performance.now();
      const frame = (now: number) => {
        if (!live) return;
        const w = canvas.width;
        const h = canvas.height;
        const turn = ((now - t0) / 4600) * Math.PI * 2;
        ctx.fillStyle = "#070806";
        ctx.fillRect(0, 0, w, h);
        const glow = ctx.createRadialGradient(w / 2, h * 0.4, 20, w / 2, h * 0.4, w * 0.46);
        glow.addColorStop(0, "rgba(214,255,63,0.14)");
        glow.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = "#12160f";
        ctx.beginPath();
        ctx.ellipse(w * 0.34, h * 0.8, w * 0.2, h * 0.055, 0, 0, Math.PI * 2);
        ctx.ellipse(w * 0.74, h * 0.8, w * 0.12, h * 0.045, 0, 0, Math.PI * 2);
        ctx.fill();
        const bob = Math.sin(turn) * 6;
        paintTurn(ctx, machine, w * 0.34, h * 0.48 + bob, w * 0.5, h * 0.42, turn);
        paintTurn(ctx, rider, w * 0.74, h * 0.46 - bob, w * 0.28, h * 0.5, turn);
        raf = requestAnimationFrame(frame);
      };
      raf = requestAnimationFrame(frame);
    });
    return () => {
      live = false;
      cancelAnimationFrame(raf);
    };
  }, [car, pilot]);

  return <canvas ref={ref} width={960} height={540} className="aspect-video w-full bg-black" />;
}

export function CarShow({ target, onClose }: { target: SpinTarget; onClose: () => void }) {
  const duo = Boolean(!target.video && target.side && target.pilot);
  const [src, setSrc] = useState<string | null>(target.video ?? (duo || target.tokenId ? null : target.sprite != null ? `/game/spin-${target.sprite}.mp4` : null));

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    if (target.video) {
      setSrc(target.video);
      return;
    }
    if (!target.tokenId) {
      setSrc(target.sprite != null ? `/game/spin-${target.sprite}.mp4` : null);
      return;
    }
    let live = true;
    setSrc(null);
    void loadForgeVideo({ data: { id: target.tokenId } }).then((video) => {
      if (live) setSrc(video);
    });
    return () => {
      live = false;
    };
  }, [duo, target.video, target.tokenId, target.sprite]);

  const poster = target.poster ?? (target.sprite != null ? `/game/car-${target.sprite}.png` : "");

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 p-3 sm:items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${target.name} girando`}
        className="w-full max-w-3xl border border-border bg-bg"
        onClick={(e) => e.stopPropagation()}
      >
        {duo && target.side && target.pilot ? (
          <DualSpin car={target.side} pilot={target.pilot} />
        ) : src ? (
          <video
            key={src.slice(0, 48)}
            src={src}
            poster={poster}
            autoPlay
            loop
            muted
            playsInline
            className="aspect-video w-full bg-black object-contain"
          />
        ) : (
          <img src={poster} alt="" className="aspect-video w-full bg-black object-contain" />
        )}
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <div>
            <p className="font-display text-4xl leading-none">{target.name}</p>
            <p className="text-sm text-muted">{target.car} · giro de estúdio</p>
          </div>
          <button type="button" className="min-h-11 border border-border px-4 text-sm" onClick={onClose}>
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}