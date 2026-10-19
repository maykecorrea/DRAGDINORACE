function on(): boolean {
  try {
    return localStorage.getItem("gf-sound") === "1";
  } catch {
    return false;
  }
}

let ctx: AudioContext | null = null;

/** Um tique curto. A trilha do Flow entra no lugar quando o arquivo chegar. */
export function blip(kind: "note" | "coin" | "alert" = "note"): void {
  if (!on() || typeof window === "undefined") return;
  const Ctx = window.AudioContext;
  if (!Ctx) return;
  if (!ctx) ctx = new Ctx();
  void ctx.resume();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "square";
  osc.frequency.value = kind === "coin" ? 740 : kind === "alert" ? 180 : 420;
  gain.gain.value = 0.035;
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.07);
  osc.stop(ctx.currentTime + 0.08);
}
