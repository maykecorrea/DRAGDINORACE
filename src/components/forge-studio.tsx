import { useEffect, useState } from "react";
import { MINT_COST } from "@/game/data";
import { claimForge, signatureFree } from "@/game/forge.functions";
import { inventSpec, paintSide, recordTurntable, specToCar, type ForgeSpec } from "@/game/forge";
import type { NftCar } from "@/game/data";
import { FossilWord } from "@/components/fossil-word";

const MAX_EXTRA = 2;

export function ForgeStudio({
  fossil,
  onClose,
  onMinted,
}: {
  fossil: number;
  onClose: () => void;
  onMinted: (car: NftCar) => void;
}) {
  const [drafts, setDrafts] = useState<ForgeSpec[]>([]);
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<"think" | "ask" | "confirm" | "spin" | "saved" | "fail">("think");
  const [clip, setClip] = useState<string | null>(null);
  const [note, setNote] = useState("A forja está desenhando um carro que ainda não existe.");
  const current = drafts[index];
  const extrasLeft = MAX_EXTRA - Math.max(0, drafts.length - 1);
  const locked = drafts.length >= MAX_EXTRA + 1;

  useEffect(() => {
    let live = true;
    void drawFresh(new Set()).then((spec) => {
      if (!live || !spec) return;
      setDrafts([spec]);
      setIndex(0);
      setPhase("ask");
      setNote("Gostou da imagem? O vídeo só nasce se você aprovar.");
    });
    return () => {
      live = false;
    };
  }, []);

  async function drawFresh(blocked: Set<string>, depth = 0): Promise<ForgeSpec | null> {
    if (depth > 8) {
      setPhase("fail");
      setNote("A forja não achou um desenho livre. Tenta de novo.");
      return null;
    }
    const spec = inventSpec(blocked);
    const free = await signatureFree({ data: { signature: spec.signature } }).catch(() => true);
    if (!free) {
      blocked.add(spec.signature);
      return drawFresh(blocked, depth + 1);
    }
    if (!spec.image) spec.image = paintSide(spec);
    return spec;
  }

  async function reject() {
    if (locked || phase !== "ask") return;
    setPhase("think");
    setNote("Outro projeto. A forja não repete o que já existe.");
    const blocked = new Set(drafts.map((d) => d.signature));
    const spec = await drawFresh(blocked);
    if (!spec) return;
    const next = [...drafts, spec];
    setDrafts(next);
    setIndex(next.length - 1);
    const full = next.length >= MAX_EXTRA + 1;
    setPhase("ask");
    setNote(full ? "Acabaram as mudanças. Escolhe uma das três imagens." : "Gostou da imagem? O vídeo só nasce se você aprovar.");
  }

  function askApproval() {
    if (!current?.image || phase !== "ask") return;
    if (fossil < MINT_COST) {
      setNote("Fóssil curto pra cunhar.");
      return;
    }
    setPhase("confirm");
    setNote("Aprovar trava o desenho. Depois disso é impossível mudar.");
  }

  async function accept() {
    if (!current?.image || phase !== "confirm") return;
    if (fossil < MINT_COST) {
      setNote("Fóssil curto pra cunhar.");
      return;
    }
    setPhase("spin");
    setNote("Girando no estúdio e gravando o vídeo do NFT.");
    try {
      const video = await recordTurntable(current);
      const claimed = await claimForge({
        data: {
          id: current.id,
          signature: current.signature,
          prompt: current.prompt,
          image: current.image,
          video,
        },
      });
      if (!claimed.ok) {
        if (claimed.reason === "taken") {
          const blocked = new Set(drafts.map((d) => d.signature));
          const spec = await drawFresh(blocked);
          if (spec) {
            setDrafts((prev) => prev.map((d, i) => (i === index ? spec : d)));
            setNote("Esse desenho acabou de ser cunhado. A forja trocou este projeto.");
          } else setNote("Esse desenho já existe. Escolhe outro.");
        } else setNote("A ficha não fechou. Tenta de novo.");
        setPhase("ask");
        return;
      }
      onMinted(specToCar(current));
      setClip(video);
      setPhase("saved");
      setNote("Cunhado. O giro ficou gravado nesta ficha, com um id que ninguém mais usa.");
    } catch {
      setPhase("ask");
      setNote("O giro não gravou. Tenta cunhar este de novo.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 p-3 sm:items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Forja de NFT"
        className="max-h-[92dvh] w-full max-w-3xl overflow-y-auto border border-border bg-bg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 px-4 pt-4">
          <div>
            <p className="text-xs font-semibold tracking-widest text-primary">CUNHAGEM EXCLUSIVA</p>
            <h2 className="font-display text-5xl leading-none">{current?.name ?? "Forja"}</h2>
          </div>
          <button type="button" className="min-h-11 border border-border px-4 text-sm" onClick={onClose}>
            Fechar
          </button>
        </div>
        <div className="mx-4 mt-3 flex min-h-48 items-center justify-center gap-3 bg-black px-3">
          {clip ? (
            <video src={clip} autoPlay loop muted playsInline className="max-h-64 w-full object-contain" />
          ) : current?.image ? (
            <>
              <img src={current.image} alt="" className="max-h-56 min-w-0 flex-1 object-contain" />
              {current.pilot && (
                <img src={current.pilot} alt="" className="h-40 w-28 shrink-0 object-contain" />
              )}
            </>
          ) : (
            <p className="font-display text-3xl text-primary">Desenhando…</p>
          )}
        </div>
        {current?.stickerNo && (
          <p className="px-4 pt-3 text-center font-display text-4xl leading-none tracking-widest text-primary">
            FIGURINHA {current.stickerNo}
          </p>
        )}
        {current && (
          <div className="px-4 pt-3">
            <p className="text-xs tracking-widest text-primary">{current.id}</p>
            <p className="mt-1 text-sm text-muted">
              {current.rarity} · arquétipo de pista
            </p>
            <p className="mt-2 text-sm text-pretty text-fg">{current.prompt}</p>
          </div>
        )}
        {drafts.length > 1 && (
          <ul className="mt-3 flex gap-2 overflow-x-auto px-4">
            {drafts.map((draft, i) => (
              <li key={draft.id}>
                <button
                  type="button"
                  onClick={() => phase === "ask" && setIndex(i)}
                  className={`border p-1 ${i === index ? "border-primary" : "border-border"}`}
                >
                  <img src={draft.image} alt="" className="h-16 w-28 object-contain" />
                </button>
              </li>
            ))}
          </ul>
        )}
        <p className="px-4 pt-3 text-sm text-pretty text-muted">{note}</p>
        {phase === "confirm" && (
          <p className="mx-4 mt-3 border border-danger px-3 py-2 text-sm text-pretty text-fg">
            Impossível mudar depois de aprovar. O vídeo só é gerado agora, e este carro fica travado na sua ficha.
          </p>
        )}
        <p className="px-4 text-xs tracking-widest text-muted">
          {locked ? "0 mudanças" : `${extrasLeft} mudanças`} · {MINT_COST} fóssil só se você cunhar
        </p>
        {phase !== "saved" && (
        <div className="flex flex-wrap gap-2 px-4 py-4">
          {phase === "confirm" ? (
            <>
              <button
                type="button"
                disabled={!current || fossil < MINT_COST}
                onClick={() => void accept()}
                className="min-h-11 bg-primary px-4 font-display text-3xl leading-none text-ink disabled:opacity-40"
              >
                Aprovar e gerar o vídeo · {MINT_COST} <FossilWord lime />
              </button>
              <button
                type="button"
                onClick={() => {
                  setPhase("ask");
                  setNote("Ainda dá pra trocar. O vídeo não foi gerado.");
                }}
                className="min-h-11 border border-border px-4 font-display text-3xl leading-none"
              >
                Voltar
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                disabled={!current || phase !== "ask" || fossil < MINT_COST}
                onClick={askApproval}
                className="min-h-11 bg-primary px-4 font-display text-3xl leading-none text-ink disabled:opacity-40"
              >
                {locked ? "Escolher esta imagem" : "Gostei da imagem"}
              </button>
              {!locked && (
                <button
                  type="button"
                  disabled={phase !== "ask"}
                  onClick={() => void reject()}
                  className="min-h-11 border border-border px-4 font-display text-3xl leading-none disabled:opacity-40"
                >
                  Outro projeto
                </button>
              )}
            </>
          )}
        </div>
        )}
      </div>
    </div>
  );
}
