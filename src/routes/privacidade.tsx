import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/privacidade")({
  head: () => ({ meta: [{ title: "Privacidade · Dino Drag Race" }] }),
  component: Privacidade,
});

function Privacidade() {
  return (
    <main className="min-h-dvh bg-bg px-4 py-10 text-fg">
      <article className="mx-auto grid max-w-2xl gap-4">
        <Link to="/" className="font-display text-4xl leading-none text-primary">
          DINO DRAG RACE
        </Link>
        <h1 className="font-display text-6xl leading-none">Privacidade</h1>
        <p className="text-sm text-muted">Vale para https://dinodragrace.yvion.com.br. Atualizado em 16 de outubro de 2026.</p>
        <section className="grid gap-2 border border-border bg-surface p-4 text-sm leading-relaxed">
          <h2 className="font-display text-3xl leading-none">Quem opera</h2>
          <p>O jogo Dino Drag Race, no domínio dinodragrace.yvion.com.br. Não vendemos cadastro e não passamos sua conta para anunciante.</p>
        </section>
        <section className="grid gap-2 border border-border bg-surface p-4 text-sm leading-relaxed">
          <h2 className="font-display text-3xl leading-none">O que guardamos</h2>
          <p>Nome na faixa, e-mail e a senha só como hash, se você criar a conta por e-mail.</p>
          <p>Se entrar com o Google, recebemos o nome, o e-mail e a foto que o Google autorizar. A senha do Google não passa por aqui.</p>
          <p>O progresso do jogo fica na sua conta: carros, peças, armas, fóssil e a ficha da pista.</p>
          <p>O servidor também vê o endereço de IP e o navegador, o bastante para manter a sessão e segurar abuso.</p>
        </section>
        <section className="grid gap-2 border border-border bg-surface p-4 text-sm leading-relaxed">
          <h2 className="font-display text-3xl leading-none">Para que serve</h2>
          <p>Entrar na pista, achar sua garagem de novo e impedir que outra pessoa use a sua ficha. Não usamos isso para anúncio dirigido.</p>
        </section>
        <section className="grid gap-2 border border-border bg-surface p-4 text-sm leading-relaxed">
          <h2 className="font-display text-3xl leading-none">Com quem compartilhe</h2>
          <p>O Google, só quando você escolhe entrar com o Google. O banco que guarda a conta fica no nosso servidor. Não há venda de lista.</p>
        </section>
        <section className="grid gap-2 border border-border bg-surface p-4 text-sm leading-relaxed">
          <h2 className="font-display text-3xl leading-none">Quanto tempo</h2>
          <p>Enquanto a conta existir. Se pedir para apagar, tiramos o cadastro e o progresso ligado a ela.</p>
        </section>
        <section className="grid gap-2 border border-border bg-surface p-4 text-sm leading-relaxed">
          <h2 className="font-display text-3xl leading-none">Seus pedidos</h2>
          <p>Para ver, corrigir ou apagar a conta, mande um e-mail a partir do endereço cadastrado, com o assunto “Privacidade Dino Drag Race”, para o mesmo endereço que você usa no jogo. Se entrou pelo Google, use esse Gmail.</p>
        </section>
        <p className="text-sm text-muted">
          <Link to="/termos" className="text-primary">
            Termos de uso
          </Link>
        </p>
      </article>
    </main>
  );
}
