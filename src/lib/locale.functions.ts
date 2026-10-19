import { createServerFn } from "@tanstack/react-start";
import { getCookie } from "@tanstack/react-start/server";
import type { Lang } from "./locale";

export const detectLocale = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const choice = getCookie("ddr-lang-choice");
    const saved = getCookie("ddr-lang");
    if (choice === "1" && (saved === "pt" || saved === "en")) return { lang: saved as Lang };
    return { lang: "pt" as Lang };
  } catch {
    return { lang: "pt" as Lang };
  }
});
