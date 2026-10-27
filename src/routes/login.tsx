import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { GROK_PROVIDERS, authClient, authEnabled, signIn } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { useLocale } from "@/lib/locale-context";
import { gfGate } from "@/game/gf.functions";

type Modo = "entrar" | "criar";

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>): { modo: Modo } => ({
    modo: search.modo === "criar" ? "criar" : "entrar",
  }),
  loader: () => gfGate(),
  component: LoginPage,
});

function LoginPage() {
  const { modo } = Route.useSearch();
  const { home } = Route.useLoaderData();
  const { user, isPending } = useCurrentUserState();
  const { t, lang, choose } = useLocale();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [remember, setRemember] = useState(true);
  const criar = modo === "criar";

  useEffect(() => {
    try {
      if (localStorage.getItem("dino-remember") === "0") setRemember(false);
    } catch {
      /* private mode */
    }
  }, []);

  if (isPending) {
    return (
      <main className="grid min-h-dvh place-items-center bg-bg">
        <p className="font-display text-4xl text-primary">{t("login.reading")}</p>
      </main>
    );
  }
  if (user) return <Navigate to={home} />;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!email.includes("@") || password.length < 8) {
      setError(t("login.bad"));
      return;
    }
    setBusy(true);
    const creds = { email, password, callbackURL: home, rememberMe: remember };
    const result = criar
      ? await authClient.signUp.email({ ...creds, name: name.trim() || email.split("@")[0] })
      : await authClient.signIn.email(creds);
    setBusy(false);
    if (result.error) {
      setError(result.error.message || t("login.fail"));
      return;
    }
    window.location.assign(home);
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-bg px-4 py-10 text-fg">
      <div className="w-full max-w-md border border-border bg-surface p-5">
        <div className="flex items-start justify-between gap-3">
          <Link to="/" className="font-display text-4xl leading-none text-primary">
            DINO DRAG RACE
          </Link>
          <div className="flex items-center" style={{ gap: "8px" }}>
            <button
              type="button"
              onClick={() => choose("pt")}
              className="inline-flex items-center font-pixel text-xs tracking-wider"
              style={{
                gap: "6px",
                padding: "5px 9px",
                borderRadius: "6px",
                border: "none",
                background: lang === "pt" ? "radial-gradient(circle, rgba(214,255,63,0.28) 0%, rgba(214,255,63,0.08) 70%, transparent 100%)" : "transparent",
                boxShadow: lang === "pt" ? "0 0 14px rgba(214,255,63,0.55), 0 0 4px rgba(214,255,63,0.35)" : "none",
                color: lang === "pt" ? "#d6ff3f" : "#9aa18c",
                textShadow: lang === "pt" ? "0 0 8px rgba(214,255,63,0.85)" : "none",
                opacity: lang === "pt" ? 1 : 0.55,
              }}
            >
              <img src="/flags/br.svg" alt="BR" style={{ width: "20px", height: "14px", objectFit: "cover", borderRadius: "2px", filter: lang === "pt" ? "drop-shadow(0 0 6px rgba(214,255,63,0.75))" : "none" }} />
              PT
            </button>
            <button
              type="button"
              onClick={() => choose("en")}
              className="inline-flex items-center font-pixel text-xs tracking-wider"
              style={{
                gap: "6px",
                padding: "5px 9px",
                borderRadius: "6px",
                border: "none",
                background: lang === "en" ? "radial-gradient(circle, rgba(214,255,63,0.28) 0%, rgba(214,255,63,0.08) 70%, transparent 100%)" : "transparent",
                boxShadow: lang === "en" ? "0 0 14px rgba(214,255,63,0.55), 0 0 4px rgba(214,255,63,0.35)" : "none",
                color: lang === "en" ? "#d6ff3f" : "#9aa18c",
                textShadow: lang === "en" ? "0 0 8px rgba(214,255,63,0.85)" : "none",
                opacity: lang === "en" ? 1 : 0.55,
              }}
            >
              <img src="/flags/us.svg" alt="US" style={{ width: "20px", height: "14px", objectFit: "cover", borderRadius: "2px", filter: lang === "en" ? "drop-shadow(0 0 6px rgba(214,255,63,0.75))" : "none" }} />
              EN
            </button>
          </div>
        </div>
        <h1 className="mt-3 font-display text-6xl leading-none">{criar ? t("login.create") : t("login.enter")}</h1>
        <p className="mt-2 text-sm text-muted">
          {criar ? t("login.createBlurb") : t("login.enterBlurb")}
        </p>
        {authEnabled ? (
          <>
            <div className="mt-5 grid gap-2">
              {GROK_PROVIDERS.map((p) => (
                <button
                  key={p.providerId}
                  type="button"
                  onClick={() => signIn(p.providerId, { callbackURL: home })}
                  className="min-h-11 border border-border bg-bg px-3 text-left text-sm"
                >
                  {t("login.continue", { name: p.label })}
                </button>
              ))}
            </div>
            <p className="my-4 text-center text-xs tracking-widest text-muted">{t("login.orEmail")}</p>
            <form onSubmit={submit} className="grid gap-3">
              {criar && (
                <label className="grid gap-1 text-sm">
                  {t("login.name")}
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="name"
                    className="min-h-11 border border-border bg-bg px-3 text-fg"
                  />
                </label>
              )}
              <label className="grid gap-1 text-sm">
                {t("login.email")}
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  className="min-h-11 border border-border bg-bg px-3 text-fg"
                />
              </label>
              <label className="grid gap-1 text-sm">
                {t("login.password")}
                <input
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={criar ? "new-password" : "current-password"}
                  className="min-h-11 border border-border bg-bg px-3 text-fg"
                />
              </label>
              <label className="flex min-h-11 items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => {
                    const on = e.target.checked;
                    setRemember(on);
                    try {
                      localStorage.setItem("dino-remember", on ? "1" : "0");
                    } catch {
                      /* private mode */
                    }
                  }}
                  className="size-4 accent-[#d6ff3f]"
                />
                {t("login.remember")}
              </label>
              {error && <p className="text-sm text-danger">{error}</p>}
              <button type="submit" disabled={busy} className="min-h-11 bg-primary font-display text-3xl leading-none text-ink disabled:opacity-40">
                {busy ? t("login.wait") : criar ? t("login.register") : t("login.enter")}
              </button>
            </form>
          </>
        ) : (
          <p className="mt-4 text-sm text-muted">{t("login.off")}</p>
        )}
        <p className="mt-4 text-sm text-muted">
          {criar ? (
            <Link to="/login" search={{ modo: "entrar" }} className="text-primary">
              {t("login.have")}
            </Link>
          ) : (
            <Link to="/login" search={{ modo: "criar" }} className="text-primary">
              {t("login.create")}
            </Link>
          )}
        </p>
        <p className="mt-3 flex gap-3 text-xs text-muted">
          <Link to="/privacidade" className="hover:text-primary">Privacidade</Link>
          <Link to="/termos" className="hover:text-primary">Termos</Link>
        </p>
      </div>
    </main>
  );
}
