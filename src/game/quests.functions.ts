import { createServerFn } from "@tanstack/react-start";
import {
  questAdminAct as adminAct,
  questAdminBoard as adminBoard,
  questAdminLogin as adminLogin,
  questBoard as loadBoard,
  questChallenge as challenge,
  questCheckin as checkin,
  questLogin as login,
  questManual as manual,
  questRedeem as redeem,
  questSpins as spins,
  reportQuestRace as race,
  useQuestSpin as spend,
} from "./quests.server";

export const questChallenge = createServerFn({ method: "POST" })
  .validator((data: { wallet?: string }) => data)
  .handler(async ({ data }) => challenge(data));

export const questLogin = createServerFn({ method: "POST" })
  .validator((data: { wallet?: string; signature?: string; answer?: number; ref?: string }) => data)
  .handler(async ({ data }) => login(data));

export const questBoard = createServerFn({ method: "GET" }).handler(async () => loadBoard());

export const questCheckin = createServerFn({ method: "POST" }).handler(async () => checkin());

export const questManual = createServerFn({ method: "POST" })
  .validator((data: { quest?: string; handle?: string }) => data)
  .handler(async ({ data }) => manual(data));

export const questRedeem = createServerFn({ method: "POST" })
  .validator((data: { kind?: string }) => data)
  .handler(async ({ data }) => redeem(data));

export const reportQuestRace = createServerFn({ method: "POST" })
  .validator((data: { won?: boolean }) => data)
  .handler(async ({ data }) => race(data));

export const questSpins = createServerFn({ method: "GET" }).handler(async () => spins());

export const useQuestSpin = createServerFn({ method: "POST" })
  .validator((data: { n?: number }) => data)
  .handler(async ({ data }) => spend(data));

export const questAdminLogin = createServerFn({ method: "POST" })
  .validator((data: { password?: string }) => data)
  .handler(async ({ data }) => adminLogin(data));

export const questAdminBoard = createServerFn({ method: "GET" }).handler(async () => adminBoard());

export const questAdminAct = createServerFn({ method: "POST" })
  .validator((data: { id?: string; op?: string; href?: string; quest?: string }) => data)
  .handler(async ({ data }) => adminAct(data));
