# Tempo 24h: imagens novas (Google Flow)

Mesmo estilo e processo das outras: as 6 referências, fundo branco liso, recorte e escala nearest-neighbor. **Luz = fundo preto** (não recortar o branco). Caminho base `/assets/gf/map/`. O Grok usa placeholder até a arte chegar.

| # | Arquivo | Caminho | px | Transparente? | Descrição (prompt curto) |
|---|---|---|---|---|---|
| 1 | `ui_relogio_frame.png` | `ui/` | 96×32 | sim (centro vazio, é moldura) | moldura do relógio do HUD: placa de metal rebitada, com o mostrador digital feito de osso e um vão vazio no meio para o texto `TER 23:40` |
| 2 | `ui_btn_esperar.png` | `ui/` | 32×32 | sim | ampulheta de osso e vidro rachado com areia de ferrugem caindo (botão "Esperar até…") |
| 3 | `ui_btn_velocidade.png` | `ui/` | 128×32 | sim | folha com 4 ícones de 32×32 lado a lado: pausa, 1×, 2×, 4×. Setas de avanço feitas de pistão e marcha |
| 4 | `ui_energia.png` | `ui/` | 64×32 | sim | bateria de osso com raio, nas versões cheia e vazia lado a lado (barra de Energia do Téo) |
| 5 | `ui_despertador.png` | `ui/` | 32×32 | sim | despertador velho de sino, com engrenagem à mostra e um parafuso no lugar do martelo ("Dormir até…") |
| 6 | `ui_placa_fechado.png` | `ui/` | 32×32 | sim | placa de lata pendurada por corrente com "Fechado" pintado à mão (vai na porta dos prédios fechados) |
| 7 | `p_caixa_eletronico.png` | `props/` | 32×32 | sim | caixa eletrônico de rua visto de cima e de frente, de metal amassado, com tela verde e boca de cédula. Fica na fachada do Banco |
| 8 | `l_caixa_eletronico.png` | `luzes/` | 32×32 | sim (**luz: gerar em fundo preto**) | brilho verde-frio da tela do caixa eletrônico, mancha de luz plana em pixel |
| 9 | `npc_golpista_zap.png` | `/assets/gf/npcs/` | 512×512 | sim | avatar de contato desconhecido no ZapDino: silhueta escura de lagarto com o rosto escondido por um celular, interrogação brilhando e luz azul de tela de madrugada (golpes da madrugada) |

**Total: 9 imagens novas.** Reaproveitado sem arte nova: `ui_periodo_*` (4 fases), `l_poste`, `l_janela`, `l_letreiro_bar`, `l_letreiro_juca`, `l_lanterna_patrulha`, `int_fechamento`, `int_casa`, `ui_balao_cadeado` e os sprites `w_*`. A tinta por hora é feita no código.
