# Parte TEMPO-24H: Relógio de 24 horas, horários da cidade e eventos por hora

**Contexto:** **Garagem Falida**, modo Plus do Dino Drag Race. Hoje o tempo anda em **dias** e em **3 períodos ligados aos PA** (Mapa-A, A.2 e A.7: `period = f(apLeft)`). O dono quer um **relógio de 24h**: o dia tem horas, cada lugar tem seu horário e os eventos acontecem em horas certas, de dia, de noite ou de madrugada. Esta parte **troca a fonte do tempo**: o período deixa de vir dos PA e passa a vir do relógio. **A economia não muda**: os PA continuam sendo a unidade de trabalho (3 por dia, de segunda a sábado, mais o 4º PA "virar a noite", até 2× por semana), e o fechamento continua com as 14 etapas do GDD 3.3, na mesma ordem.

**Depende de:** Partes 02, 03, 06, 07, 08 e 11, Mapa A–I e IA-NPCs. **Substitui:** Mapa-A A.2, a coluna "Aberto em" de A.4, a regra `period = f(apLeft)` de A.7, o A.6 (desmaio por "60 passos") e a tinta por período de Mapa-B B.4. Todo o resto continua valendo.

> ## ⚠ REGRA DE ARTE
> **O Grok não gera arte.** Os ícones novos (relógio, ampulheta, velocidade, energia, placa FECHADO, caixa eletrônico e outros) vêm do **Google Flow** pelos nomes de `tempo-24h-imagens.md`. Sem arquivo → placeholder com o `id`, como na Mapa-H. As luzes `l_*`, os ícones `ui_periodo_*` e `int_fechamento` já foram entregues.

---

## 1. Modelo do relógio

### 1.1 Unidade e formato
- `state.clock.t` é um **inteiro em minutos de jogo** desde o início da campanha. O minuto 0 é a **segunda-feira da semana 0, 00:00**. A campanha começa em `t = 360` (segunda, 06:00).
- Valores derivados, sempre calculados e nunca guardados à parte:
  - `semana = floor(t / 10080)`
  - `diaSemana = floor((t % 10080) / 1440) + 1`, onde 1 = segunda e 7 = domingo
  - `hora = floor((t % 1440) / 60)`
  - `minuto = t % 60`
  - `calendar.week` e `calendar.day` (Parte 03) passam a ser **derivados de `t`**.
- **Fases do dia** (`periodo`, derivado da hora): **madrugada 0–5**, **manhã 6–11**, **tarde 12–17**, **noite 18–23**.

### 1.2 Velocidade (minutos de jogo por segundo real)
| Opção | Min. de jogo / s real | 24h contínuas em tempo real | Uso |
|---|---|---|---|
| Imersivo | 1 | 24 min | quem quer passear |
| **Normal (padrão)** | **2** | **12 min** | recomendado |
| Rápido | 4 | 6 min | quem já conhece a cidade |
- **Na prática, um dia leva de 4 a 6 minutos reais no Normal.** O sono pula ~8h, cada PA de trabalho pula 3h (seção 1.4), e os diálogos e menus pausam o relógio. Sobram umas 6 a 7 horas de rua, ou ~3,5 min reais.
- Recomendo o Normal como padrão, e não 1 min/s. Com 1 min/s, a campanha de 52 semanas passaria de 40 horas reais. A troca de velocidade é livre e não gasta nada (ação `SET_SPEED`).

### 1.3 Quando o relógio para (pausa automática)
O relógio só corre com o **mundo ativo**: Téo na rua ou dentro de um lugar, sem nenhum painel aberto. Ele **para** nestes casos:
- diálogos, negociação e conversa com IA, inclusive com "Cliente pensando…" na tela;
- telas e painéis T07–T20, cartas, Caderno e Fechamento;
- mini-jogos (o tempo da ação é aplicado inteiro no fim, ver 1.4) e cutscenes;
- aba escondida (`visibilitychange`) ou jogo fechado. **O tempo não corre com o jogo fechado.**

### 1.4 Quanto tempo cada ação gasta (`content/.../v1/time.json`)
O tempo da ação é aplicado **inteiro e de uma vez**, depois do mini-jogo ou do diálogo. Na tela, o relógio "gira" rápido por 1,5 s.
| Ação | PA | Tempo de jogo |
|---|---|---|
| Trabalhar em serviço (1 PA, com mini-jogo da Parte E) | 1 | **3h** |
| `NIGHT_SHIFT`, 4º PA "virar a noite" (só pode começar entre 20:00 e 03:00) | 1 | 3h |
| Prospectar na Praça | 1 | 2h |
| Consultar ficha / Inspecionar carcaça / Ler letra miúda | 1 | 1h |
| Cobrar cliente (fora o tempo de ir até ele) | 1 | 1h |
| Descansar (`REST`) | 1 | 2h (+15 de Energia, além do Ânimo do GDD) |
| Estudar com a Dona Âmbar | 1 | 2h |
| Garimpo no Ferro-Velho (Parte F) | 1 | 2h |
| Contrabando na Toca do Rato | 1 | 1h |
| Eventos de rua de 1 PA (Parte G) | 1 | 1h |
| Conversa simples (`TALK`) | 0 | 10 min |
| Negociação de rua ou pelo quadro (Mapa-D) | 0 | 20 min |
| Comprar em fornecedor | 0 | 15 min |
| Operação no Banco ou na Cooperativa | 0 | 20 min, mais a fila (0–30 min sorteados pela semente; fila maior das 10h às 12h) |
| Caixa eletrônico | 0 | 5 min |
| Paço do Distrito (qualquer serviço) | 0 | 45 min ("burocracia") |
| Leilão (cada lote) | 0 | 30 min |
| Reunião da Associação | 0 | 2h |
| Ações de menu sem lugar (pagar dívida pelo app, aplicar ou resgatar, aceitar carta) | 0 | 0 min |
| Ossobus | 0 | 10 min fixos (+5 ₣, como hoje) |
- **Andar** é tempo real × velocidade. O servidor confere um **tempo mínimo de viagem** entre portas: `minViagem(a,b) = ceil(tiles(a,b) / 6 × speed)` minutos de jogo, a pé (6 tiles/s reais × velocidade). De moto, divide por 2. As distâncias ficam numa matriz em `places.json`, calculada pelas portas. Se o cliente chegar "rápido demais", o servidor soma a diferença.
- **Regra de fechamento:** uma ação dentro de um lugar só começa se **terminar até o horário de fechamento**. Senão aparece: *"Não dá tempo: o banco fecha às 16:00."* 15 minutos antes de fechar aparece o aviso *"Fechamos em 15 minutos"*. Na hora de fechar, Téo é posto na rua com um fade curto.

### 1.5 Fila de agenda (motor puro)
- O motor ganha `state.agenda: AgendaItem[]` (`{at, kind, payload, interrupt}`), ordenada por `at`.
- `advanceClock(state, toT)` processa tudo o que vence no caminho, em ordem. Se um item tem `interrupt:true` (visita da gangue, cliente chegando para buscar com Téo na garagem, carta presencial no lugar onde Téo está), o relógio **para ali** e devolve o evento.
- Tudo é determinístico: o servidor converte o tempo real em `TICK {minutes}` inteiro (seção 9) antes de chamar o motor. **Nada de `Date.now()` no motor.**

---

## 2. Fases do dia: luz, gente na rua e spawns

### 2.1 Tinta por hora (substitui B.4)
A tinta é **1 cor por hora**, multiplicada sobre o mapa e trocada em degrau na hora cheia, sem gradiente. Dentro dos interiores, a tinta entra com **metade da opacidade**.
| Horas | Fase | Cor | Opacidade |
|---|---|---|---|
| 00–04 | madrugada | `#0A0A20` | 60% |
| 05 | aurora | `#4A3A70` | 40% |
| 06 | manhã (nascer) | `#FFD8A0` | 10% |
| 07–11 | manhã | `#FFF4E0` | 0% |
| 12–16 | tarde | `#FFB060` | 12% |
| 17 | pôr do sol | `#FF7040` | 25% |
| 18 | crepúsculo | `#3A3070` | 35% |
| 19–23 | noite | `#1A2050` | 45% |

### 2.2 Luzes (sprites `l_*` já entregues)
| Sprite | Acende |
|---|---|
| `l_poste` | 18:00 → 05:59. Cada poste acende com atraso de 0 a 3 s reais, sorteado pela semente, para dar vida |
| `l_janela` | 18–23: 70% das janelas; 00–04: 15%; 05: 30% (quem madruga). A escolha é por semente e janela |
| `l_letreiro_bar` | enquanto o Bar estiver **aberto** (pisca à noite, seção 3) |
| `l_letreiro_juca` | enquanto o Beco do Juca estiver aberto (pisca) |
| `l_lanterna_patrulha` | junto com a patrulha dos Mandíbula (19:00–05:00, seção 4) |
| `l_caixa_eletronico` (**novo**) | 18:00 → 05:59, na fachada do Banco |

Um lugar fechado mostra a **placa `ui_placa_fechado`** na porta e apaga o letreiro e as janelas dele.

### 2.3 Densidade de NPCs por hora (substitui o "Densidade" de B)
| Fase | B1 Vila Ferrugem | B2 Avenida Cometa | B3 Baixada do Pátio |
|---|---|---|---|
| madrugada 0–5 | 0–1 | 1–2 (motoboy, policial) | 1–2 + **2 patrulheiros** |
| manhã 6–11 | 8–12 | 10–14 (pico 10–12 no Banco) | 4–6 |
| tarde 12–17 | 8–12 | 10–14 | 4–6 |
| noite 18–23 | 3–5 | 2–4 | 3–5 + 2 patrulheiros |

Tipos de pedestre (`w_*` já entregues) por horário:
- `w_crianca`: 07–18.
- `w_executivo`: 08–19, só no B2.
- `w_operario`: 05–08 e 17–19 (ida e volta do trabalho).
- `w_panfleteiro`: 09–17, na Praça.
- `w_motoboy`: sempre (pico 11–14 e 18–22).
- `w_corredor`: 19–03.
- `w_policial`: 1 no B2, das 22 às 06.
- `w_patrulheiro`: B3, das 19 às 05.

O sorteio de quem está em cada lugar (A.7) passa a rodar **no início de cada fase** (00:00, 06:00, 12:00 e 18:00), e não mais no início do dia. Os eventos de rua da Parte G também sorteiam no início de cada fase, agora **com a madrugada**.

---

## 3. Horário de funcionamento dos 23 lugares
`places.json` ganha `hours: [{dias:[1..7], de:"HH:MM", ate:"HH:MM"}]`. Se `de > ate`, a janela atravessa a meia-noite. Também ganha `closedMsg`. **1 = segunda … 7 = domingo.**
| id | Lugar | Funciona | Detalhe por hora |
|---|---|---|---|
| `casa` | Casa do Téo | 24h | Dormir, cochilar, Caderno. Fechamento domingo 19:00 |
| `garagem` | Garagem | 24h para Téo | **Balcão** (clientes chegam) seg–sáb 08–18. Domingo: oficina fechada para serviços |
| `praca` | Praça do Fóssil | área aberta 24h | Prospectar 08–18. Coach no palanque sáb 10–12. Panfleteiro do Ovo de Ouro 09–17. Pipoqueiro 16–21. Feira de rua qua e sáb 05–12 |
| `bar` | Bar do Osso Seco | seg–sáb 16:00–02:00 · dom 16:00–22:00 | Ricardão 19–23. Rumores 20–01 |
| `ambar` | Escritório da Dona Âmbar | seg–sex 08–12 e 14–18 · sáb 08–12 | fecha para almoço 12–14 |
| `banco` | Banco Fóssil Central | **seg–sex 10:00–16:00** | **Corte às 16:00**: boleto ou TED pago depois disso só compensa no próximo dia útil, às 10:00. **Caixa eletrônico** na fachada: todo dia 06–22 (saldo, pagar boleto, resgatar Cofrinho); 22–06 só saldo e "saque noturno" de até 100 ₣ |
| `coop` | Cooperativa Ossada | seg–sex 09–17 · sáb 09–12 | |
| `paco` | Paço do Distrito | seg–sex 08:00–13:00 | Senhas até 12:00. Sessão de licitação quarta 09:00 |
| `megaosso` | Megaosso Atacado | seg–sáb 07–19 · dom 08–13 | Compra até 17:00 chega amanhã às 09:00; depois das 17:00, chega depois de amanhã |
| `cascotech` | Casco-Tech | seg–sex 08–18 · sáb 08–12 | Mesma regra de entrega |
| `quiosque_cartao` | Quiosque Cartão Platina | seg–sáb 09–20 | O vendedor corre atrás do Téo na saída do Banco |
| `ponto_motoboy` | Ponto dos Motoboys | 24h | Picos 11–14 e 18–22. De madrugada, 1 ou 2 motoboys |
| `raptorlog` | Raptor Log / Ossobus | seg–sex 08–17 (Ato 2) | Silvana só com hora marcada, 08–11 |
| `delegacia` | Delegacia | 24h (Ato 3) | **Delegada Ankylo seg–sex 08–18** (a carta "Denúncia" só sai com ela). Fora disso, plantão: guarda as provas e manda voltar |
| `associacao` | Associação de Comerciantes | seg–sex 14–18 | **Reunião semanal quarta 19:00–21:00** |
| `ferrovelho` | Ferro-Velho do Zé Fêmur | seg–sáb 07–17 | Garimpo só começa até 15:00 (precisa de luz) |
| `leilao` | Pátio do Leilão | sáb 14–17 (**visitação**: Inspecionar) · **seg 08:00–12:00** | Lote 1 às 09:30, lote 2 às 10:30 (Nível 1+) |
| `beco_juca` | Beco do Juca | todo dia 15:00–02:00 | **Juros do Juca em pessoa até sábado 23:00** |
| `toca_rato` | Toca do Rato | todo dia 22:00–04:00 | contrabando |
| `galpao_mandibula` | Galpão dos Mandíbula | sempre acessível (perigo) | Rex no galpão 20–03. Patrulha no B3 19–05 |
| `faixa` | Faixa de Arrancada | qui–sáb 20:00–03:00 (Ato 3) | Torneio: sábado das semanas 18, 30 e 44, 20:00–02:00 |
| `bet` | Barraca da Bet | qui–dom 19:00–03:00 (Ato 3) | |
| `memorial` | Memorial do Pai | 24h | |

**Lugar fechado:** `ENTER_PLACE` devolve 422 com a hora em que reabre, calculada pela tabela: *"O Banco Fóssil abre segunda às 10:00. Agora: sábado 17:42."* O balão tem o botão **"Esperar até 10:00"**, que dispara `WAIT` (seção 8). Se for longe ou passar da noite, o botão sugere ir dormir.

As cartas presenciais (A.7, `delivery.periods`) trocam `periods` por `hours` (mesmo formato). Na migração, `manha`, `tarde`, `noite` e `madrugada` viram 06–12, 12–18, 18–24 e 00–06.

---

## 4. Eventos por horário

### 4.1 Horários fixos (todo dia ou dia útil)
| Hora | O quê | Regra |
|---|---|---|
| 06:00 | Amanhecer | Se Téo não dormiu, o PA do dia renova com punição (seção 5.3) |
| 07:00 | ZapDino do dia | As cartas do dia (máx. 1 de oferta e 1 de evento, GDD 3.2) chegam **no horário da carta** (`card.hours`); sem `hours`, às 07:00 |
| 09:00 | Recebíveis e entregas | Recebíveis com vencimento no dia **caem às 09:00** (o calote é sorteado aqui). As entregas de fornecedor chegam às 09:00 |
| 10:00 | Compensação | Pagamentos feitos depois do corte do dia útil anterior compensam agora |
| 16:00 | **Corte do banco** | Depois disso, nada compensa hoje (seg–sex) |
| fim de cada bloco de turno | Produção dos funcionários | O PA de cada funcionário é aplicado no fim do bloco dele (seção 5.1) |

### 4.2 Semanais
| Quando | Evento | Regra |
|---|---|---|
| seg 06:00 | Leads da semana | A metade "de segunda" (Parte 06) aparece nas janelas de cada cliente (seção 6) |
| seg 09:30 e 10:30 | Leilão | Lotes 1 e 2 (Parte F). A visitação de sábado à tarde permite Inspecionar antes |
| qua 19:00 | Reunião da Associação | Filiado: ir à reunião é a forma de ganhar a prova "recibo de outro comerciante" (GDD 2.5) |
| **sex 21:00** | **Visita dos Mandíbula** (semana ≥ 3) | Rex ou um capanga vai à garagem (`interrupt`). Se Téo **paga a proteção** e não está lá, eles deixam recado e voltam sáb 21:00. Se faltar às duas, o valor é cobrado no fechamento **+10% de "incômodo"**. Se **recusou**, a visita é ameaça (Ânimo −3) |
| 1 noite por semana, 03:00 | Sabotagem (se recusou) | A **chance semanal do GDD não muda** (25%, 10% ou 5%). Só muda a hora: a noite (ter–sáb) é sorteada pela semente. Se Téo estiver **acordado na garagem** nessa hora (virando a noite), a sabotagem é evitada (Ânimo −5 pelo susto, sem prova extra) |
| sáb 10–12 | Coach no palanque | Cartas 4/5 presenciais |
| **sáb 23:00** | **Prazo do Juca** | Juro não pago no beco até aqui = semana em atraso (regras do GDD/F4). Domingo 10:00 o capanga do Juca bate na porta (cena) |
| sáb 20:00 (sem. 18, 30, 44) | Torneio | Faixa até 02:00 |
| **dom 19:00** | **Fechamento Semanal** | As 14 etapas do GDD 3.3, na ordem, num horário fixo. Juros, salários, fixos, parcelas, fatura do cartão e cheque especial **rodam só aqui**, como hoje. A partir das 18:30 aparece o aviso; às 19:00 Téo vai para casa com fade (o tempo de viagem é cobrado) e abre `int_fechamento`, à luz de vela |
| domingo, dia inteiro | Dia sem PA | Domingo continua sem PA de trabalho, como no GDD (18 PA/semana). Téo pode andar, conversar, comprar no Megaosso até 13h, ir ao Bar, ao Beco… Ânimo +5 no fechamento (GDD) |
| semana 16, 03:00 (dia sorteado) | Aniversário do incêndio | A carta de memória (GDD `aniversario`) dispara **na madrugada**, na hora do fogo. Se Téo estiver dormindo, ele acorda (sono interrompido) |

### 4.3 Aleatórios com peso por hora
Todo sorteio usa o RNG da campanha. O peso multiplica a chance base da Parte G ou da tabela abaixo.
| Evento | Quando pode | Chance / peso | Efeito | Mitigação |
|---|---|---|---|---|
| Eventos de rua (Parte G) | conforme o `hours` de cada um | base 35%; B3 à noite 50%; **B3 de madrugada 65%** | Parte G | — |
| `furto_noturno` (**novo**, semana ≥ 4) | 01:00–04:00, com **ninguém** na garagem | 1,5% por noite no Nível 0 (portão quebrado), 1% no L1+; ×0,5 com câmeras; 0 se Téo ou funcionário estiver em turno noturno | Perde 15% do valor do estoque (mín. 50, máx. 500 ₣) | Seguro Carapaça cobre 80%; câmeras |
| **Golpe da madrugada** (**novo**, semana ≥ 3) | ZapDino 00:00–05:00 | 35% por semana, numa hora sorteada | Uma de 3 cartas: `zap_falso_gerente` ("passa o código que chegou": perde até 800 ₣ do caixa/Cofrinho), `zap_parente` ("Téo, é o Zeca, número novo, me manda 300 agora"), `zap_premio` ("pague 150 de taxa para liberar 5.000") | Recusar. **Com Energia ≤ 25, os destaques da Dona Âmbar não aparecem** ("cansado, você não vê os sinais"). Lição **L31** |
| Roubo na rua | Téo na rua do B3, 19–05 | 5% por hora parada (esperar ou cochilar na rua) e 20% no desmaio | Perde 10% do caixa (máx. 150 ₣), como A.6 | Não ficar no B3 à noite |
| A fiscalização passou no Rato | regra do GDD (10% depois da 3ª compra) | a hora é sorteada de 00 a 02; se acontecer com Téo lá dentro, também Ânimo −5 | GDD | — |
| Clientes especiais da madrugada | 00–05 | Zé Trilo, Dona Estegolina, Brontes (Ossobus), Velma Asa Negra e Johnny Rajada (`madrugada:true` em `clientes-horarios.json`) | Pagam **+20% de urgência** no preço de referência | **1 dos 5 é caloteiro** (o Johnny): "nem todo dinheiro fácil da madrugada é bom" |

Os eventos de rua da Parte G ganham `hours`:
- `racha_avenida` 21–03.
- `sombra_rex` 19–01.
- `fiscal_rua` 09–16.
- `idosa_sacolas` 08–11.
- `cliente_urgente` 07–19.
- `rumor_bar` 20–01.
- `bet_amigo` 20–02.
- `motoboy_quebrado` 11–14 e 18–23.
- `meteorito_rua` a qualquer hora.

### 4.4 Prazos dos clientes com hora
- Ao aceitar, o motor cria `job.prazoAt = início do dia (aceite + prazo.dias) + prazo_hora`. O `prazo_hora` vem de `clientes-horarios.json`; o padrão é 18:00.
- O quadro e o HUD mostram, por exemplo, *"Zé Trilo: quinta 02:30 (faltam 7h)"*.
- **Atraso:** multa de 10% por **cada 24h iniciadas** depois de `prazoAt` (máx. 50%, GDD) e Rep −4, como hoje.
- **Retirada:** o serviço pronto só é entregue se o cliente vier na janela `retirada` dele **e houver alguém na garagem** (Téo ou funcionário em turno). Se a oficina estiver vazia, o cliente vai embora (*"Passei aí e tava fechado"*) e volta na próxima janela. Se isso passar do `prazoAt`, **conta atraso**. Ensina que presença e equipe valem dinheiro.
- A resposta à proposta pelo quadro ("no dia seguinte", GDD 4.7) passa a chegar na **próxima janela de contato** do cliente, no mínimo `responde_em_min` depois.
- Lead não atendido some 72h depois de aparecer (era `expiresDay` = 3 dias).
- Frota (Silvana): o prazo é semanal (`prazo_semanal`). As vans entram segunda 07:00 e saem até sábado 12:00. A multa semanal é a do GDD.

---

## 5. Equipe, turnos, hora extra, energia e sono

### 5.1 Turnos (1 PA = 1 bloco de 3h)
| Funcionário | PA/dia (GDD) | Turno (seg–sáb) |
|---|---|---|
| Tico | 1 | 13:00–16:00 (estuda de manhã) |
| Dona Brasa | 2 | 08:00–11:00 e 13:00–16:00 |
| Osso Duro | 2 | 08:00–11:00 e 13:00–16:00 |
| Primo Zeca | 1 | 10:00–13:00 ("chega atrasado") |
| Lábia (vendedora) | — | 09–17 na Praça e na Avenida: os leads dela aparecem nesse horário |
| Dona Âmbar (contadora) | — | ter e qui, 14–18, na garagem (painel de alertas). O escritório dela continua nos horários da seção 3 |
- A produção do funcionário é aplicada no fim de cada bloco (11:00, 16:00…). Um serviço pode ficar **"Pronto às 16:00"**.
- O funcionário em turno conta como "alguém na garagem" para a retirada (4.4) e para o furto (4.3).
- O furto de 5% do Zeca (GDD) acontece no sábado às 02:00. Com câmeras, há 50% de chance de a gravação mostrar o Zeca (carta).

### 5.2 Hora extra e adicional noturno (**novo**, vira lição L32)
- `OVERTIME {employeeId, bloco}` agenda um bloco extra de 3h: **19:00–22:00** (hora extra) ou **22:00–01:00** (hora extra + noturno). Domingo, qualquer bloco.
- **Valor do bloco** = `salário semanal / (6 × PA/dia)`.
  - Hora extra: ×1,5.
  - Noturna: ×1,8 (1,5 × 1,2 de adicional noturno).
  - Domingo: ×2,0.
  - É pago no fechamento, na etapa de salários, com a linha "Horas extras" na cascata.
- Máximo de **2 blocos extras por funcionário por semana**.
- Depois de um bloco noturno, o 1º bloco do dia seguinte desse funcionário tem **−0,05 de sucesso** (cansaço).
- **Para lembrar o "falir é fácil":** a hora extra resolve o prazo, mas come a margem. A prévia mostra *"Este serviço com hora extra: margem 134 → 61 ₣"*.

### 5.3 Energia e sono do Téo (**novo**)
- `clock.energy` vai de 0 a 100 e é **separada do Ânimo**: a Energia é o corpo no dia, e o Ânimo é a cabeça na semana (GDD).
- **Gasto:** −4 por hora acordado e −6 a mais por PA de trabalho. Exemplo: acordar às 06:00, trabalhar 3 PA e ir dormir às 23:00 deixa ~14 de Energia.
- **Dormir** (`SLEEP {wakeAt}`, só em `casa`): o jogador escolhe o despertador (padrão 06:00). Ao acordar, `energy = min(100, 20 + 12 × horas dormidas)`. **Cochilo** (1–3h, `SLEEP` com `wakeAt` perto): recupera Energia, **não renova PA**.
- **Renovação dos PA:** só **uma vez por dia de calendário**, ao acordar **a partir das 04:00**.
  - Sono ≥ 4h → 3 PA.
  - Sono < 4h → **2 PA** e Ânimo −3.
  - **Sem dormir:** às 06:00 o dia renova sozinho com **2 PA**, Ânimo −10 e Energia como está.
  - Os PA que sobraram do dia anterior somem, como no GDD.
  - Domingo não renova (0 PA).
- **"Virar a noite"** (`NIGHT_SHIFT`): regras do GDD (+1 PA, máx. 2/semana, Ânimo −10). Agora só pode começar entre 20:00 e 03:00 e dá "café forte" (+20 de Energia) antes do bloco. A consequência vem pelo relógio: dormir das 02:00 às 08:00 faz perder a manhã (banco, Paço e leilão). Dormir menos de 4h custa 1 PA.
- **Cansado** (Energia ≤ 25):
  - a janela de acerto dos mini-jogos (Parte E) fica 15% menor;
  - a negociação começa com 1 de paciência a menos;
  - Téo anda a 0,8× da velocidade;
  - os destaques da Dona Âmbar somem (4.3).
- **Exausto** (≤ 10): a tela pulsa e o HUD avisa *"Vai pra casa, Téo."*
- **Desmaio** (Energia 0, **substitui o A.6**): Téo acorda em casa 6h depois (ou às 08:00, o que vier mais tarde) com Ânimo −5. Se estava no B3 entre 19 e 05, há 20% de chance de roubo (10% do caixa, máx. 150 ₣). Lição L29.

---

## 6. Janelas de horário dos 50 clientes
Arquivo novo: **`content/garagem-falida/v1/clientes-horarios.json`**, que vai anexo a esta parte. Ele mapeia cada `id` de `clientes.json` para:
```json
"ze_trilo": {
  "lugar": "ponto_motoboy",
  "aparece": [{"dias":[1,2,3,4,5,6,7],"de":"01:00","ate":"05:00"},
              {"dias":[1,2,3,4,5,6,7],"de":"01:00","ate":"04:00","lugar":"Garagem"}],
  "contato": {"de":"23:00","ate":"07:00","responde_em_min":30},
  "retirada": {"dias":[1,2,3,4,5,6,7],"de":"00:00","ate":"02:30"},
  "prazo_hora": "02:30",
  "madrugada": true,
  "mod_periodo": {"madrugada": 0.05},
  "bloqueio": [{"dias":[1,2,3,4,5,6,7],"de":"08:00","ate":"15:00"}],
  "nota": "Faxineiro noturno do metrô..."
}
```
**Regras:**
1. **`aparece`:** o personagem do lead (C.3) só nasce no mapa dentro dessas janelas, no `lugar` dado (id de `places.json` ou zona `rua_b1`, `rua_b2` ou `rua_b3`). Se o lugar estiver fechado, ele espera na porta. A tabela de C.3 (tipo → lugar/período) vira só o **padrão** para quem não tem entrada.
2. **`contato`:** é quando ele responde no ZapDino. Mensagem fora da janela fica "visto às…" e é respondida na abertura da próxima janela. `bloqueio` = horários em que não atende de jeito nenhum.
3. **Abordar fora da janela**, como bater na porta às 2h de quem dorme cedo, custa paciência −1 e p −0,05, **exceto** para quem tem `madrugada:true`.
4. **`mod_periodo`:** um ajuste pequeno (|x| ≤ 0,05) somado ao `p` de aceitação do GDD 4.7, conforme a fase. É regra do motor (o resultado é igual com IA e sem IA). Exemplo: Jacira (−0,05 de manhã, +0,05 à tarde).
5. **`retirada` e `prazo_hora`:** seção 4.4. Extras: `prazo_semanal` (frota), `janela_servico` (Brontes: os ônibus só param das 00:30 às 05:00), `limite_parada_h` (Dra. Mosa: ambulância parada no máximo 4h) e `vistoria` (Eng. Herrera: vistoria surpresa ter e qui, 14–16).
6. **Caloteiros:** o horário é **mais um sinal**, nunca um rótulo. Eles buscam na sexta depois do corte do banco, no sábado à noite ou de madrugada, só atendem à noite, e a "Loja" está sempre fechada. Isso fica em `nota_servidor`. **`nota_servidor` nunca vai para o navegador** (`redactState` e `/api/gf/content` removem o campo). O navegador recebe só `aparece`, `contato`, `retirada`, `prazo_hora` e `madrugada`.
7. Validar com zod na carga: 50 ids, um para um com `clientes.json`, horários no formato `HH:MM` (`24:00` só como `ate`).

---

## 7. Ganchos para os diálogos com IA (IA-NPCs)
- O bloco de regras fixas do prompt (IA-NPCs §10, item 2) ganha **`<contexto_tempo>`**, montado pelo servidor:
  ```
  agora: terça 23:40 · periodo: noite · lugar: bar · fecha_em: 2h20
  energia_teo: cansado · fora_da_janela_do_cliente: sim · cliente_madrugada: nao
  horarios_reais: [banco seg–sex 10–16, juca 15–02, ...só os lugares citáveis]
  ```
- **Regras para a IA**, escritas no prompt:
  - cumprimentar pela hora: *bom dia* de 05:00 a 11:59, *boa tarde* de 12:00 a 17:59, *boa noite* de 18:00 a 04:59;
  - de madrugada, quem não é `madrugada:true` fica **desconfiado** ou estranha a hora (*"Isso é hora, menino?"*);
  - pode comentar o cansaço do Téo se `energia_teo` for cansado ou exausto;
  - **nunca inventar horário**: só citar `horarios_reais`;
  - pode lembrar o prazo com a hora (*"Até quinta, 2h30, hein"*).
- A **emoção inicial** sugerida muda com a hora: de madrugada, fora da janela, começa `desconfiado`. Essa é só uma sugestão de fala: a paciência e o `p` vêm do motor (regra 3 da seção 6).
- **Roteiro de reserva:** `dialogs/npc_fallback/<tipo>.json` ganha `saudacao_manha`, `saudacao_tarde`, `saudacao_noite`, `saudacao_madrugada` e `fora_de_hora`. Os NPCs fixos dos lugares ganham `fechando` (*"Vou baixar a porta em 15 minutos"*).
- O filtro de vazamento não muda. Horário não é segredo, mas a `nota_servidor` dos caloteiros **nunca** entra no prompt.

---

## 8. HUD e controles
- **Relógio** no canto superior, em moldura `ui_relogio_frame`: `TER 23:40 · Sem 3`, com o ícone da fase (`ui_periodo_manha`, `_tarde`, `_noite` ou `_madrugada`, que já existem). O ícone gira na troca de fase, com o `sfx_periodo` da Parte I.
- **Barra de Energia** (`ui_energia`) ao lado dos ossos de PA. Fica amarela ≤ 25 e vermelha piscando ≤ 10.
- **Velocidade** (`ui_btn_velocidade`): ⏸ / 1× / 2× / 4× (Imersivo, Normal, Rápido). O ⏸ é a pausa manual, que sempre pode.
- **"Esperar até…"** (`ui_btn_esperar`, ampulheta) abre um menu curto: *próxima hora cheia* · *quando [lugar mais perto] abrir* · *amanhecer (06:00)* · *cliente X chegar* · *fechamento (dom 19:00)*. Dispara `WAIT`. **Interrompe** em evento `interrupt`. Esperar na rua do B3 à noite tem risco (4.3). Na Casa, em vez de esperar, o jogo oferece **Dormir até…** (`ui_despertador`).
- **Avisos:** *"Banco fecha em 30 min"* (quando há boleto ou dívida pendente), *"Juca: prazo hoje 23:00"* e um chip com o próximo prazo de cliente (*"Zé Trilo 02:30 · 7h"*).
- **Minimapa e quadro:** um cadeado (`ui_balao_cadeado`, que já existe) nos lugares fechados e a hora de abertura no tooltip.
- O botão **"Encerrar dia"** vira **"Ir dormir"**: Téo vai para casa (o tempo de viagem conta) e abre o despertador.
- **Celular:** o relógio e a energia ficam numa linha só; o menu de esperar abre como folha de baixo.

---

## 9. Save, load e validação no servidor (o servidor é o dono do tempo)
- **Estado:** `GameState.clock = { t, speed, energy, awakeSinceT, lastSleep:{from,to}, apRefillDay, overtime:[] }`, além de `agenda[]`. **`world.period` é removido**: vira o derivado `periodo(t)`.
- **Tabela:** `gf_runs` ganha `clock_ack_at timestamptz` (hora real do último ack de relógio) e `t int` (para "Continuar: Semana 3, terça 23:40" no seletor).
- **Como o tempo real entra:**
  - Toda `POST /api/gf/action` aceita `elapsedMs` opcional, e quando o jogador está parado o cliente manda um **`TICK`** a cada 10 s.
  - O servidor credita `ms = min(elapsedMs, now − clock_ack_at, 15000)` e só se o mundo estava ativo: sem conversa de IA aberta (`gf_npc_conversations.status='open'`) e sem cutscene ou fechamento.
  - Ele converte em `minutes = floor((ms × speed + resto) / 1000)`, guarda o resto em `clock.subMs`, grava `clock_ack_at = now` e chama o motor com **`TICK {minutes}` inteiro, que vai para o `gf_action_log`**. O replay continua idêntico.
- **O cliente só consegue atrasar o próprio relógio**, o que é o mesmo que pausar e é permitido. Ele nunca consegue adiantar: o limite é a hora real do servidor. Adiantar de verdade só pelas ações oficiais: `WAIT`, `SLEEP`, `NIGHT_SHIFT` e as ações com tempo da tabela 1.4.
- **Validações do servidor:** horário do lugar em `ENTER_PLACE` e em toda ação de lugar (inclui a regra "termina antes de fechar"), tempo mínimo de viagem (1.4), janelas de cliente, `NIGHT_SHIFT` só entre 20:00 e 03:00, renovação de PA (5.3) e `WAIT` que não atravessa `interrupt` nem o fechamento.
- **Na tela:** o relógio é interpolado localmente (`t + elapsed × speed`) e se ajusta ao `t` de cada resposta. Se a diferença passar de 5 min, ele salta sem animação.
- **Ao carregar** (`GET /api/gf/run`): `clock_ack_at = now`. O tempo com o jogo fechado **não** conta, e o jogo volta pausado com "Continuar".
- **Migração de saves antigos:** `t = week×10080 + (day−1)×1440 + [06:00, 12:00, 18:00, 00:00 do dia seguinte][3 − apLeft]`, `energy = 70`, `speed = 2`. A agenda é reconstruída a partir dos jobs, recebíveis, entregas e cartas.
- **Bots do simulador (Parte 18):** jogam só com `WAIT` e `SLEEP`, sem `TICK`. A meta de balanceamento do GDD 16.3 (≥ 80% dos ingênuos falidos antes da semana 20) tem que continuar valendo. Rodar de novo com 10.000 sementes.
- **Conteúdo:** `time.json` (velocidades, custos de tempo, tintas, densidades, energia, horas extras), `places.json.hours`, `clientes-horarios.json`, `cards.hours` e as 3 cartas novas de golpe da madrugada. Tudo em JSON e validado com zod. **Nenhum número fixo no código.**

**Lições novas (Parte 13):**
- **L31 "Golpe tem hora"**. Gatilho: o 1º golpe da madrugada, caindo ou não. Ideia: *"Golpista escolhe a hora em que você está cansado e sozinho. Banco não manda mensagem de madrugada e nunca pede código."*
- **L32 "Hora extra custa caro"**. Gatilho: a 1ª hora extra noturna. Ideia: a conta 1,5 × 1,2 com o salário real do funcionário.

---

## 10. Critérios de aceite
- [ ] `clock.t` é a única fonte do tempo. `calendar.week/day` e `periodo` são derivados. Teste de 0:00, 05:59, 06:00, 11:59, 12:00, 17:59, 18:00 e 23:59.
- [ ] As 3 velocidades funcionam (24, 12 e 6 min reais por 24h contínuas). A pausa vale em diálogo, painel, mini-jogo, cutscene e aba escondida.
- [ ] Cada ação da tabela 1.4 avança exatamente o tempo dela. As ações de 0 min não mexem no relógio.
- [ ] Os PA continuam 3 por dia de segunda a sábado, 0 no domingo e o 4º PA no máximo 2× por semana. Teste de semana completa = 18 PA (+2).
- [ ] A renovação de PA só acontece uma vez por dia, ao acordar a partir das 04:00. Dormir 2 vezes não dá 6 PA. Ficar sem dormir renova às 06:00 com 2 PA e Ânimo −10.
- [ ] Energia: o gasto e a recuperação batem com 5.3. Com Energia ≤ 25, a janela do mini-jogo fica menor e os destaques da Âmbar somem. Com 0, desmaio com as regras novas (substitui A.6).
- [ ] Os 23 lugares respeitam `hours`. Lugar fechado → 422 com a hora de reabertura e o botão "Esperar até". A ação que não termina antes de fechar é recusada. O aviso de 15 min e a saída forçada funcionam.
- [ ] Corte do banco às 16:00: um boleto pago às 16:05 de sexta compensa segunda às 10:00. O caixa eletrônico tem limite de 100 ₣ entre 22 e 06.
- [ ] O Fechamento roda **domingo 19:00**, com as 14 etapas na mesma ordem e o mesmo resultado numérico do motor antigo para a mesma sequência de ações (teste de regressão).
- [ ] Juca: um juro não pago até sábado 23:00 = semana em atraso. Gangue: visita sexta 21:00 com retorno sábado 21:00 e +10% se faltar às duas. Sabotagem: a chance semanal do GDD não muda, só a hora, e é evitada com Téo acordado na garagem.
- [ ] O furto noturno, o golpe da madrugada e o roubo no B3 só acontecem nas horas certas e são determinísticos pela semente.
- [ ] Clientes: os 50 de `clientes-horarios.json` nascem só nas janelas deles. ZapDino fora da janela → "visto às…". Retirada sem ninguém na garagem → o cliente volta e o atraso conta depois do `prazoAt`.
- [ ] `nota_servidor` nunca aparece na rede, no DOM, em `/api/gf/content` nem no prompt do LLM.
- [ ] Hora extra: os valores ×1,5, ×1,8 e ×2,0 e o limite de 2 por semana funcionam, e a linha aparece no fechamento.
- [ ] IA: o prompt recebe `<contexto_tempo>`. Bom dia, boa tarde e boa noite estão certos nas fronteiras de hora. O NPC fica desconfiado de madrugada se não for `madrugada:true`. O roteiro de reserva tem as 4 saudações.
- [ ] Anti-trapaça: um `elapsedMs` de 10 minutos enviado depois de 3 s reais credita só 3 s × speed. Um replay do `gf_action_log` dá o mesmo hash de estado.
- [ ] Migração: um save antigo com `apLeft=1` abre às 18:00 do mesmo dia.
- [ ] Simulador (Parte 18) com o relógio: a meta de falência dos ingênuos continua ≥ 80% antes da semana 20.
- [ ] Tinta por hora, luzes `l_*` e densidade de NPC conforme as tabelas da seção 2.
- [ ] **Nenhuma arte gerada pelo Grok**: só nomes de `tempo-24h-imagens.md` e placeholders.
