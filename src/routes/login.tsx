import { useState, type FormEvent } from "react";
import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { GROK_PROVIDERS, authClient, authEnabled, signIn } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

type Modo = "entrar" | "criar";

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>): { modo: Modo } => ({
    modo: search.modo === "criar" ? "criar" : "entrar",
  }),
  component: LoginPage,
});

function LoginPage() {
  const { modo } = Route.useSearch();
  const { user, isPending } = useCurrentUserState();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const criar = modo === "criar";

  if (isPending) {
    return (
      <main className="grid min-h-dvh place-items-center bg-bg">
        <p className="font-display text-4xl text-primary">Lendo a ficha…</p>
      </main>
    );
  }
  if (user) return <Navigate to="/dashboard" />;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!email.includes("@") || password.length < 8) {
      setError("Email válido e senha com 8 caracteres ou mais.");
      return;
    }
    setBusy(true);
    const result = criar
      ? await authClient.signUp.email({ email, password, name: name.trim() || email.split("@")[0], callbackURL: "/dashboard" })
      : await authClient.signIn.email({ email, password, callbackURL: "/dashboard" });
    setBusy(false);
    if (result.error) {
      setError(result.error.message || "Não entrou. Confere email e senha.");
      return;
    }
    window.location.assign("/dashboard");
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-bg px-4 py-10 text-fg">
      <div className="w-full max-w-md border border-border bg-surface p-5">
        <Link to="/" className="font-display text-4xl leading-none text-primary">
          DINO DRAG RACE
        </Link>
        <h1 className="mt-3 font-display text-6xl leading-none">{criar ? "Criar conta" : "Entrar"}</h1>
        <p className="mt-2 text-sm text-muted">
          {criar ? "A garagem fica nesta conta. Google, X ou email." : "A mesma ficha, a mesma garagem."}
        </p>
        {authEnabled ? (
          <>
            <div className="mt-5 grid gap-2">
              {GROK_PROVIDERS.map((p) => (
                <button
                  key={p.providerId}
                  type="button"
                  onClick={() => signIn(p.providerId, { callbackURL: "/dashboard" })}
                  className="min-h-11 border border-border bg-bg px-3 text-left text-sm"
                >
                  Continuar com {p.label}
                </button>
              ))}
            </div>
            <p className="my-4 text-center text-xs tracking-widest text-muted">OU EMAIL</p>
            <form onSubmit={submit} className="grid gap-3">
              {criar && (
                <label className="grid gap-1 text-sm">
                  Nome na faixa
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="name"
                    className="min-h-11 border border-border bg-bg px-3 text-fg"
                  />
                </label>
              )}
              <label className="grid gap-1 text-sm">
                Email
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
                Senha
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
              {error && <p className="text-sm text-danger">{error}</p>}
              <button type="submit" disabled={busy} className="min-h-11 bg-primary font-display text-3xl leading-none text-ink disabled:opacity-40">
                {busy ? "Aguarde" : criar ? "Cadastrar" : "Entrar"}
              </button>
            </form>
          </>
        ) : (
          <p className="mt-4 text-sm text-muted">O acesso está desligado.</p>
        )}
        <p className="mt-4 text-sm text-muted">
          {criar ? (
            <Link to="/login" search={{ modo: "entrar" }} className="text-primary">
              Já tenho conta
            </Link>
          ) : (
            <Link to="/login" search={{ modo: "criar" }} className="text-primary">
              Criar conta
            </Link>
          )}
        </p>
      </div>
    </main>
  );
}
