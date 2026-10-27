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
        <section className="grid gap-2 border border-primary/50 bg-surface p-4 text-sm leading-relaxed">
          <p>Este jogo é de mentirinha: fósseis não valem dinheiro de verdade.</p>
          <p>Aqui não tem aposta: os prêmios são fixos e você vê antes de jogar.</p>
          <p>Menor de 13 anos joga com um adulto cuidando da conta.</p>
        </section>
        <p className="text-sm text-muted">Vale para dinodragrace.yvion.com.br. Atualizado em 23 de outubro de 2026.</p>
        <section className="grid gap-2 border border-border bg-surface p-4 text-sm leading-relaxed">
          <h2 className="font-display text-3xl leading-none">Quem cuida do jogo</h2>
          <p>O Dino Drag Race, no site dinodragrace.yvion.com.br. Não vendemos seus dados e não passamos sua conta para anunciantes.</p>
        </section>
        <section className="grid gap-2 border border-border bg-surface p-4 text-sm leading-relaxed">
          <h2 className="font-display text-3xl leading-none">O que guardamos</h2>
          <p>Seu nome de piloto e seu e-mail. Se você criar a conta por e-mail, a senha fica guardada de forma protegida (criptografada).</p>
          <p>Se você entrar com o Google, recebemos o nome, o e-mail e a foto que o Google liberar. A senha do Google nunca passa por aqui.</p>
          <p>O progresso do jogo fica na sua conta: carros, peças, armas, fósseis e corridas.</p>
          <p>O servidor também vê o endereço de internet (IP) e o navegador, só para manter você conectado e evitar abuso.</p>
        </section>
        <section className="grid gap-2 border border-border bg-surface p-4 text-sm leading-relaxed">
          <h2 className="font-display text-3xl leading-none">Para que usamos</h2>
          <p>Para você entrar, achar sua garagem de novo e impedir que outra pessoa use a sua conta. Não usamos isso para anúncios.</p>
        </section>
        <section className="grid gap-2 border border-border bg-surface p-4 text-sm leading-relaxed">
          <h2 className="font-display text-3xl leading-none">Com quem compartilhamos</h2>
          <p>Só com o Google, e só quando você escolhe entrar com o Google. Sua conta fica guardada no nosso servidor. Não vendemos listas.</p>
        </section>
        <section className="grid gap-2 border border-border bg-surface p-4 text-sm leading-relaxed">
          <h2 className="font-display text-3xl leading-none">Por quanto tempo</h2>
          <p>Enquanto a conta existir. Se você pedir para apagar, apagamos o cadastro e o progresso da conta.</p>
        </section>
        <section className="grid gap-2 border border-border bg-surface p-4 text-sm leading-relaxed">
          <h2 className="font-display text-3xl leading-none">Seus pedidos</h2>
          <p>Para ver, corrigir ou apagar a conta, mande um e-mail do endereço cadastrado com o assunto "Privacidade Dino Drag Race". Se entrou com o Google, use esse mesmo Gmail. Crianças: peçam ajuda a um responsável.</p>
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
