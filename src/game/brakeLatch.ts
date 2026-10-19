/** Soltura do Espaço. A tecla pode chegar com code vazio se o W continua preso. */

export type KeyLike = { code?: string; key?: string; keyCode?: number };

export type SpaceLatch = {
  down: boolean;
  /** performance.now() da soltura. Fica até a largada, mesmo se o quadro pular. */
  releaseAt: number;
};

export function isSpaceKey(e: KeyLike): boolean {
  return e.code === "Space" || e.key === " " || e.key === "Spacebar" || e.keyCode === 32;
}

export function noteSpaceDown(latch: SpaceLatch, repeat = false): void {
  latch.down = true;
  if (!repeat) latch.releaseAt = 0;
}

export function noteSpaceUp(latch: SpaceLatch, now: number): void {
  latch.down = false;
  if (latch.releaseAt === 0) latch.releaseAt = now;
}

/**
 * Freio da largada. A soltura vale na hora, inclusive com outra tecla presa,
 * e não é descartada se o passo de 60 Hz não rodar nesse quadro.
 * `held` é o botão na tela ou uma tecla ainda marcada. A soltura do teclado ganha de um toque preso.
 */
export function readBrake(latch: SpaceLatch, held: boolean, launched: boolean): { brake: boolean; pulse: boolean; at: number } {
  if (launched) {
    latch.releaseAt = 0;
    return { brake: false, pulse: false, at: 0 };
  }
  const released = latch.releaseAt > 0 && !latch.down;
  const brake = !released && (latch.down || held);
  return { brake, pulse: released, at: released ? latch.releaseAt : 0 };
}
