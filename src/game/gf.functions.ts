import { createServerFn } from "@tanstack/react-start";
import { gfEnabled } from "./gf";

export const gfGate = createServerFn({ method: "GET" }).handler(async () => {
  const enabled = gfEnabled();
  return { enabled, home: enabled ? ("/modos" as const) : ("/dashboard" as const) };
});
