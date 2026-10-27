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
        <section className="grid gap-2 border border-primary/50 bg-surface p-4 text-sm leading-relaxed">
          <p>Este jogo é de mentirinha: fósseis não valem dinheiro de verdade.</p>
          <p>Aqui não tem aposta: os prêmios são fixos e você vê antes de jogar.</p>
          <p>Menor de 13 anos joga com um adulto cuidando da conta.</p>
        </section>
        <p className="text-sm text-muted">Vale para dinodragrace.yvion.com.br. Atualizado em 23 de outubro de 2026.</p>
        <section className="grid gap-2 border border-border bg-surface p-4 text-sm leading-relaxed">
          <h2 className="font-display text-3xl leading-none">O jogo</h2>
          <p>Dino Drag Race é um jogo de corrida no navegador. Ao entrar, criar conta ou correr, você aceita estes termos e a política de privacidade.</p>
        </section>
        <section className="grid gap-2 border border-border bg-surface p-4 text-sm leading-relaxed">
          <h2 className="font-display text-3xl leading-none">A conta</h2>
          <p>A conta é sua. Não conte a senha para ninguém. Você pode entrar com e-mail ou com o Google. Podemos fechar contas que trapaceiam, atacam o servidor ou usam o nome de outra pessoa.</p>
        </section>
        <section className="grid gap-2 border border-border bg-surface p-4 text-sm leading-relaxed">
          <h2 className="font-display text-3xl leading-none">Idade</h2>
          <p>Menores de 18 anos jogam com autorização de um responsável. Menores de 13 anos só jogam com um responsável criando e cuidando da conta.</p>
        </section>
        <section className="grid gap-2 border border-border bg-surface p-4 text-sm leading-relaxed">
          <h2 className="font-display text-3xl leading-none">Fósseis e itens</h2>
          <p>Fósseis, carros e peças são coisas do jogo. Não são dinheiro de verdade, não dão lucro e as regras podem mudar quando o jogo mudar.</p>
        </section>
        <section className="grid gap-2 border border-border bg-surface p-4 text-sm leading-relaxed">
          <h2 className="font-display text-3xl leading-none">O que não prometemos</h2>
          <p>O jogo pode sair do ar, atrasar ou mudar. Ele é oferecido como está, sem garantia de que uma corrida vai terminar ou de que um item vai ficar igual.</p>
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
