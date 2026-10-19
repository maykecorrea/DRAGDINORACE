export class GfError extends Error {
  readonly status: number;
  readonly body: Record<string, unknown>;

  constructor(status: number, message: string, extra: Record<string, unknown> = {}) {
    super(message);
    this.name = "GfError";
    this.status = status;
    this.body = { error: message, ...extra };
  }
}

export function isUniqueViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && "code" in err && (err as { code?: string }).code === "23505";
}
