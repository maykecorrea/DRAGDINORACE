import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/termos")({
  head: () => ({ meta: [{ title: "Termos · Dino Drag Race" }] }),
  component: Termos,
});

function Termos() {
  return (
    <main className="min-h-dvh bg-bg px-4 py-10 text-fg">
      <article className="mx-auto grid max-w-2xl gap-4">
        <Link to="/" className="font-display text-4xl leading-none text-primary">
          DINO DRAG RACE
        </Link>
        <h1 className="font-display text-6xl leading-none">Termos de uso</h1>
        <p className="text-sm text-muted">Vale para https://dinodragrace.yvion.com.br. Atualizado em 16 de outubro de 2026.</p>
        <section className="grid gap-2 border border-border bg-surface p-4 text-sm leading-relaxed">
          <h2 className="font-display text-3xl leading-none">O jogo</h2>
          <p>Dino Drag Race é um jogo de corrida no navegador. Entrar, criar conta ou correr significa que você aceita estes termos e a política de privacidade.</p>
        </section>
        <section className="grid gap-2 border border-border bg-surface p-4 text-sm leading-relaxed">
          <h2 className="font-display text-3xl leading-none">A conta</h2>
          <p>A ficha é sua. Não passe a senha. Você pode entrar com e-mail ou com o Google. A gente pode fechar uma conta que trapaceie, ataque o servidor ou use o nome de outra pessoa.</p>
        </section>
        <section className="grid gap-2 border border-border bg-surface p-4 text-sm leading-relaxed">
          <h2 className="font-display text-3xl leading-none">Idade</h2>
          <p>O jogo não é para menor de 13 anos. Se você tem entre 13 e 18, entra com autorização de quem é responsável por você.</p>
        </section>
        <section className="grid gap-2 border border-border bg-surface p-4 text-sm leading-relaxed">
          <h2 className="font-display text-3xl leading-none">Fóssil e itens</h2>
          <p>Fóssil, carros e peças são itens do jogo. Não são dinheiro, não são promessa de lucro e podem mudar de regra quando a pista mudar.</p>
        </section>
        <section className="grid gap-2 border border-border bg-surface p-4 text-sm leading-relaxed">
          <h2 className="font-display text-3xl leading-none">O que não prometemos</h2>
          <p>A pista pode cair, atrasar ou mudar. O jogo é oferecido como está, sem garantia de que uma corrida vai terminar ou de que um item vai continuar igual.</p>
        </section>
        <p className="text-sm text-muted">
          <Link to="/privacidade" className="text-primary">
            Política de privacidade
          </Link>
        </p>
      </article>
    </main>
  );
}
