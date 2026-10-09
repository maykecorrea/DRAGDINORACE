export function createAudio() {
  let ctx: AudioContext | null = null;
  let master: GainNode | null = null;
  let engine: GainNode | null = null;
  let oscA: OscillatorNode | null = null;
  let oscB: OscillatorNode | null = null;
  let filter: BiquadFilterNode | null = null;
  let noise: AudioBuffer | null = null;
  let muted = false;

  function unlock() {
    const AC = window.AudioContext;
    if (!ctx) {
      ctx = new AC({ latencyHint: "interactive" });
      master = ctx.createGain();
      master.gain.value = 0.22;
      master.connect(ctx.destination);
      filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 800;
      engine = ctx.createGain();
      engine.gain.value = 0;
      engine.connect(filter);
      filter.connect(master);
      oscA = ctx.createOscillator();
      oscA.type = "sawtooth";
      oscA.frequency.value = 48;
      oscB = ctx.createOscillator();
      oscB.type = "square";
      oscB.frequency.value = 50;
      const thin = ctx.createGain();
      thin.gain.value = 0.22;
      oscA.connect(engine);
      oscB.connect(thin);
      thin.connect(engine);
      oscA.start();
      oscB.start();
      const len = ctx.sampleRate * 0.4;
      noise = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = noise.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    }
    if (ctx.state === "suspended") void ctx.resume();
  }

  function setMuted(next: boolean) {
    muted = next;
    if (master && ctx) master.gain.setTargetAtTime(next ? 0 : 0.22, ctx.currentTime, 0.03);
  }

  function engineRpm(rpm: number, on: boolean, nitro: boolean) {
    if (!ctx || !oscA || !oscB || !engine || !filter || muted) return;
    const f = 42 + (rpm / 9000) * 190 + (nitro ? 28 : 0);
    oscA.frequency.setTargetAtTime(f, ctx.currentTime, 0.04);
    oscB.frequency.setTargetAtTime(f * 0.51, ctx.currentTime, 0.04);
    filter.frequency.setTargetAtTime(420 + rpm * 0.22 + (nitro ? 600 : 0), ctx.currentTime, 0.05);
    const level = rpm <= 0 && !on ? 0 : on ? (nitro ? 0.28 : 0.16) : 0.03;
    engine.gain.setTargetAtTime(level, ctx.currentTime, 0.05);
  }

  function blip(kind: "shift" | "good" | "bad" | "nitro" | "tick") {
    if (!ctx || !master || !noise || muted) return;
    const src = ctx.createBufferSource();
    src.buffer = noise;
    const g = ctx.createGain();
    const peak = kind === "nitro" ? 0.35 : kind === "bad" ? 0.2 : kind === "tick" ? 0.08 : 0.16;
    g.gain.setValueAtTime(peak, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + (kind === "nitro" ? 0.28 : 0.12));
    const f = ctx.createBiquadFilter();
    f.type = kind === "bad" ? "lowpass" : "highpass";
    f.frequency.value = kind === "tick" ? 1400 : kind === "good" ? 900 : 240;
    src.connect(f);
    f.connect(g);
    g.connect(master);
    src.start();
    src.stop(ctx.currentTime + 0.3);
  }

  function resume() {
    if (ctx && ctx.state === "suspended") void ctx.resume();
  }

  return { unlock, setMuted, engineRpm, blip, resume };
}

export type AudioBus = ReturnType<typeof createAudio>;
