// @ts-nocheck
import { useEffect, useRef, useState } from "react";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { partsOf } from "../../../../../gf-engine/clock.ts";
import { FOODS, LEVELS, hungerOf, levelOf, nextLevel, readPantry, RECIPES, thirstOf, xpOf } from "../../../../../gf-engine/body.ts";
import { clientHome, here, placeNome } from "../../../../../gf-engine/district.ts";
import { leadVisible, quotePreview, workIndex } from "../../../../../gf-engine/contracts.ts";
import { formatF, bps } from "../../../../../gf-engine/format.ts";
import { fixedTotal } from "../../../../../gf-engine/weeklyClose.ts";
import { missingMaterials } from "../../../../../gf-engine/production.ts";
import { nextLift, nextShelf, stockCap, stockQty } from "../../../../../gf-engine/fittings.ts";
import { priceFromPct } from "../text";
import { Face } from "../Face";
import { MOLDURA_FOGAO } from "./molduras";

var import_jsx_runtime = { Fragment, jsx, jsxs };
var V = "/assets/gf/v2/telas";
var Q$1 = "20";
export function tela(file) {
	return `${V}/${file}.png?v=${Q$1}`;
}
function clientNome$1(pack, id) {
	return pack.clients.find((item) => item.id === id)?.nome ?? "Cliente";
}
function serviceNome$1(pack, id) {
	return pack.services.find((item) => item.id === id)?.nome ?? "Serviço";
}
function materialNome(pack, id) {
	return pack.materials.find((item) => item.id === id)?.nome ?? "peça";
}
function workerNome(pack, id) {
	return id === "teo" ? "Téo" : pack.employees.find((item) => item.id === id)?.nome ?? "Oficina";
}
function quotePrice$1(ref, pct, priceMin, priceMax) {
	const min = Math.round(ref * priceMin);
	const max = Math.round(ref * priceMax);
	return Math.min(max, Math.max(min, priceFromPct(ref, pct)));
}
function daysLeft$1(state, lead) {
	const left = lead.expiresDay - workIndex(state.calendar.week, state.calendar.day);
	if (left <= 0) return "expira hoje";
	if (left === 1) return "expira em 1 dia";
	return `expira em ${left} dias`;
}
function replyWhen$1(state, lead) {
	const at = lead.proposal?.replyAt;
	if (typeof at !== "number") return "amanhã";
	const mins = at - state.clock.t;
	if (mins <= 0) return "agora";
	if (mins < 90) return `em ${Math.max(1, Math.round(mins))} min`;
	const hours = Math.max(1, Math.round(mins / 60));
	return hours === 1 ? "em 1 hora" : `em ${hours} horas`;
}
function dueLabel(week, day) {
	return `${[
		"",
		"seg",
		"ter",
		"qua",
		"qui",
		"sex",
		"sáb",
		"dom"
	][day] ?? "dia"} · sem ${week + 1}`;
}
function isLate(state, week, day) {
	return workIndex(state.calendar.week, state.calendar.day) > workIndex(week, day);
}
function away(state) {
	return typeof state.flags.district === "string" && state.flags.district !== "oficina";
}
export function Tela({ title, bg, bgHalf, focus = "50% 50%", onClose, children, mark }) {
	const ref = useRef(null);
	useEffect(() => {
		(ref.current?.querySelector("button, input, select"))?.focus();
	}, [title]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		ref,
		className: mark ? `gf-tela ${mark}` : "gf-tela",
		role: "dialog",
		"aria-modal": "true",
		"aria-labelledby": "gf-tela-title",
		style: { ["--gf-foco"]: focus },
		onKeyDown: (event) => {
			if (event.key !== "Tab" || !ref.current) return;
			const nodes = [...ref.current.querySelectorAll("button, input, select, textarea")].filter((item) => !item.hasAttribute("disabled"));
			if (nodes.length === 0) return;
			const index = nodes.indexOf(document.activeElement);
			if (event.shiftKey && index <= 0) {
				event.preventDefault();
				nodes[nodes.length - 1]?.focus();
			} else if (!event.shiftKey && index === nodes.length - 1) {
				event.preventDefault();
				nodes[0]?.focus();
			}
		},
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "gf-tela-fit",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
					className: bgHalf ? "gf-tela-bg is-full" : "gf-tela-bg",
					src: bg,
					alt: ""
				}),
				bgHalf && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
					className: "gf-tela-bg is-half",
					src: bgHalf,
					alt: ""
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "gf-tela-placa",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
						src: tela("tela_placa_titulo"),
						alt: ""
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						id: "gf-tela-title",
						children: title
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: "gf-tela-x",
					"aria-label": "Fechar",
					onClick: onClose,
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
						src: tela("tela_btn_fechar"),
						alt: ""
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "gf-tela-stage",
					children
				})
			]
		})
	});
}
export function ArtBtn({ kind, children, disabled, onClick, title }) {
	const face = disabled ? "desativado" : kind;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
		type: "button",
		className: `gf-artbtn is-${face}`,
		disabled,
		title,
		onClick,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
			src: tela(`tela_btn_${face}`),
			alt: ""
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children })]
	});
}
export function Stepper({ value, min, max, label, onChange }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "gf-stepper",
		role: "group",
		"aria-label": label,
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				"aria-label": "Menos",
				disabled: value <= min,
				onClick: () => onChange(Math.max(min, value - 1)),
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
					src: tela("tela_stepper_menos"),
					alt: ""
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("b", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
				src: tela("tela_stepper_campo"),
				alt: ""
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: value })] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				"aria-label": "Mais",
				disabled: value >= max,
				onClick: () => onChange(Math.min(max, value + 1)),
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
					src: tela("tela_stepper_mais"),
					alt: ""
				})
			})
		]
	});
}
function Meter({ pct, label }) {
	const width = Math.max(0, Math.min(100, pct));
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "gf-artbar",
		role: "progressbar",
		"aria-valuenow": Math.round(width),
		"aria-valuemin": 0,
		"aria-valuemax": 100,
		"aria-label": label,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
			className: "gf-artbar-track",
			src: tela("tela_barra_trilho"),
			alt: ""
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			style: { width: `${width}%` },
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
				src: tela("tela_barra_preenchimento"),
				alt: ""
			})
		})]
	});
}
export function XpBar({ xp }) {
	const rank = levelOf(xp);
	const nxt = nextLevel(xp);
	const span = nxt ? Math.max(1, nxt.xp - rank.xp) : 1;
	const into = nxt ? xp - rank.xp : span;
	const pct = Math.max(0, Math.min(100, into / span * 100));
	const tip = nxt ? `Faltam ${nxt.xp - xp} de XP para o nível ${nxt.nome}.` : "Nível máximo.";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "gf-xpcard",
		title: tip,
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
				className: "gf-xpseal",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
					src: tela("hud_xp_selo_nivel"),
					alt: ""
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: rank.level + 1 })]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
				className: "gf-xpmedal",
				src: `/assets/gf/conta/nivel/${rank.file}`,
				alt: rank.nome
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
				className: "gf-xptrack",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
					src: tela("hud_xp_trilho"),
					alt: ""
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", {
					style: { width: `${pct}%` },
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
						src: tela("hud_xp_preenchimento"),
						alt: ""
					})
				})]
			})
		]
	});
}
var DEPOSITS$1 = [
	0,
	30,
	50,
	100
];
export function QuadroTela({ state, pack, busy, onAct, onClose }) {
	const counters = state.leads.filter((lead) => lead.status === "counter" && leadVisible(state, lead));
	const open = state.leads.filter((lead) => (lead.status ?? "open") === "open" && leadVisible(state, lead));
	const pending = state.leads.filter((lead) => lead.status === "pending");
	const cards = [
		...open.map((lead) => ({
			lead,
			tone: "creme"
		})),
		...counters.map((lead) => ({
			lead,
			tone: "amarelo"
		})),
		...pending.map((lead) => ({
			lead,
			tone: "azul"
		}))
	];
	const [pick, setPick] = useState(cards[0]?.lead.id ?? "");
	const [pct, setPct] = useState(100);
	const [deposit, setDeposit] = useState(0);
	const [deadline, setDeadline] = useState(pack.balance.contracts.deadlineMin);
	const chosen = cards.find((item) => item.lead.id === pick) ?? cards[0];
	const rule = pack.balance.contracts;
	const price = chosen ? quotePrice$1(chosen.lead.refPrice, pct, rule.priceMin, rule.priceMax) : 0;
	let quote = null;
	if (chosen?.tone === "creme") try {
		quote = quotePreview(state, pack, chosen.lead.id, price, deposit);
	} catch {
		quote = null;
	}
	const home = chosen ? here(state) === clientHome(chosen.lead.apparentType) : false;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Tela, {
		title: "Quadro de clientes",
		bg: tela("bg_quadro_clientes"),
		focus: "40% 50%",
		onClose,
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "gf-cork",
				children: [cards.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "gf-cork-empty",
					children: "Ninguém na porta. Prospectar no pátio traz gente na outra semana."
				}), cards.map(({ lead, tone }) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					className: `gf-ticket${chosen?.lead.id === lead.id ? " is-on" : ""}`,
					onClick: () => setPick(lead.id),
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
						src: tela(`quadro_bilhete_${tone}`),
						alt: ""
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Face, {
							id: lead.apparentType,
							salt: lead.id
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: clientNome$1(pack, lead.apparentType) }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: serviceNome$1(pack, lead.service) }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: tone === "azul" ? `A resposta chega ${replyWhen$1(state, lead)}` : daysLeft$1(state, lead) }),
						tone !== "azul" && lead.quotes[0] && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("em", { children: [
							"“",
							lead.quotes[0],
							"”"
						] }),
						tone === "creme" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("small", { children: ["Ref. ", formatF(lead.refPrice)] }),
						tone === "amarelo" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("small", { children: ["Quer ", formatF(lead.counterPrice ?? 0)] }),
						lead.record && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("small", {
							className: "is-hot",
							children: ["⚠ ", lead.record]
						})
					] })]
				}, lead.id))]
			}),
			pending.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "gf-sent",
				children: [
					"Proposta enviada! A resposta chega ",
					replyWhen$1(state, pending[0]),
					".",
				]
			}),
			chosen && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", {
				className: "gf-clip",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
					className: "gf-clip-bg",
					src: tela("quadro_prancheta"),
					alt: ""
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: clientNome$1(pack, chosen.lead.apparentType) }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: serviceNome$1(pack, chosen.lead.service) }),
					chosen.tone === "creme" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [
							"Preço ",
							formatF(price),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								type: "range",
								min: 60,
								max: 160,
								step: 5,
								value: pct,
								"aria-label": "Preço da proposta",
								onChange: (event) => setPct(Number(event.target.value))
							})
						] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "gf-sign",
							children: DEPOSITS$1.map((value) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(ArtBtn, {
								kind: deposit === value ? "primario" : "secundario",
								onClick: () => setDeposit(value),
								children: [value, "%"]
							}, value))
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stepper, {
							value: deadline,
							min: rule.deadlineMin,
							max: rule.deadlineMax,
							label: "Prazo em dias",
							onChange: setDeadline
						}),
						quote && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
								"Peças ",
								formatF(quote.materialCost),
								" · tempo ",
								quote.timeCost ? formatF(quote.timeCost) : "—"
							] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: ["Lucro ", formatF(quote.margin)] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Meter, {
								pct: quote.acceptChance * 100,
								label: "Chance de aceitar"
							}),
							price < quote.breakEvenPrice && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "is-hot",
								children: "Abaixo do custo. Você perde dinheiro."
							})
						] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArtBtn, {
							kind: "primario",
							disabled: busy || !quote,
							onClick: () => onAct({
								type: "SEND_PROPOSAL",
								leadId: chosen.lead.id,
								price,
								depositPct: deposit,
								deadline
							}),
							children: "Enviar proposta"
						}),
						!chosen.lead.record && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArtBtn, {
							kind: "secundario",
							disabled: busy || state.calendar.apLeft < 1 || state.cash < 20,
							title: state.calendar.apLeft < 1 ? "Falta energia. Dorme e volta amanhã." : void 0,
							onClick: () => onAct({
								type: "CHECK_RECORD",
								targetId: chosen.lead.id
							}),
							children: "Consultar ficha −1 ⚡ · ₣ 20"
						})
					] }),
					chosen.tone === "amarelo" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: ["Ele quer ", formatF(chosen.lead.counterPrice ?? 0)] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArtBtn, {
							kind: "primario",
							disabled: busy,
							onClick: () => onAct({
								type: "ANSWER_COUNTER",
								leadId: chosen.lead.id,
								accept: true
							}),
							children: "Aceitar"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArtBtn, {
							kind: "secundario",
							disabled: busy,
							onClick: () => onAct({
								type: "ANSWER_COUNTER",
								leadId: chosen.lead.id,
								accept: false
							}),
							children: "Recusar"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArtBtn, {
							kind: "secundario",
							disabled: busy || !home,
							title: home ? "Sobe 3%." : `Só na casa do cliente (${placeNome(clientHome(chosen.lead.apparentType))}).`,
							onClick: () => onAct({
								type: "NUDGE_COUNTER",
								leadId: chosen.lead.id,
								dir: 3
							}),
							children: "Pedir +3%"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArtBtn, {
							kind: "secundario",
							disabled: busy || !home,
							title: home ? "Desce 2%." : "Só na casa do cliente.",
							onClick: () => onAct({
								type: "NUDGE_COUNTER",
								leadId: chosen.lead.id,
								dir: -2
							}),
							children: "Ceder 2%"
						})
					] }),
					chosen.tone === "azul" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
						"A resposta chega ",
						replyWhen$1(state, chosen.lead),
						". Sem ação."
					] })
				] })]
			})
		]
	});
}
var NICHOS = [
	"kit",
	"oleo",
	"chapa",
	"cabo",
	"osso",
	"bobina"
];
export function PrateleiraTela({ state, pack, busy, onAct, onMap, onOrder, onClose }) {
	const rows = NICHOS.map((id) => {
		const material = pack.materials.find((item) => item.id === id);
		const lot = state.inventory[id];
		const qty = lot?.qty ?? 0;
		const avg = lot?.avgCost ?? 0;
		const batches = lot?.batches?.map((batch) => batch.ageWeeks) ?? [];
		const age = Math.max(lot?.ageWeeks ?? 0, ...batches, 0);
		return {
			id,
			nome: material?.nome ?? id,
			qty,
			avg,
			total: qty * avg,
			age,
			rots: material?.rots !== false
		};
	});
	const [pick, setPick] = useState(rows.find((row) => row.qty > 0)?.id ?? "kit");
	const [qty, setQty] = useState(1);
	const scrap = rows.find((row) => row.id === pick);
	const pay = scrap ? Math.round(scrap.avg * Math.min(qty, scrap.qty) * .4) : 0;
	const gaps = state.jobs.flatMap((job) => missingMaterials(state, pack, job));
	const empty = rows.every((row) => row.qty <= 0);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Tela, {
		title: "Prateleira",
		bg: tela("bg_prateleira"),
		focus: "35% 50%",
		onClose,
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "gf-fit",
				children: [
					"Cabe ",
					stockQty(state),
					" de ",
					stockCap(state),
					" peças. A reforma só abre espaço.",
					nextShelf(state) && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						disabled: busy,
						onClick: () => onAct({ type: "BUY_FITTING", fitting: nextShelf(state).id }),
						children: ["Comprar ", nextShelf(state).name, " · ", formatF(nextShelf(state).cost)]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "gf-niches",
				children: rows.map((row) => {
					const lack = gaps.filter((gap) => gap.material === row.id).reduce((sum, gap) => sum + Math.max(0, gap.need - gap.have), 0);
					const coming = (state.inbound ?? []).reduce((sum, order) => sum + order.items.filter((item) => item.material === row.id).reduce((acc, item) => acc + item.qty, 0), 0);
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						className: `gf-niche${pick === row.id ? " is-on" : ""}${row.qty <= 0 ? " is-empty" : ""}`,
						onClick: () => {
							setPick(row.id);
							setQty(1);
						},
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
								src: `/assets/gf/v2/pecas/peca_${row.id}.png?v=${Q$1}`,
								alt: ""
							}),
							row.age > 4 && row.rots && row.qty > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
								className: "gf-rust",
								src: tela("prateleira_selo_ferrugem"),
								alt: "Ferrugem",
								title: "Parado há mais de 4 semanas. O ferro enferruja."
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "gf-tag",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
										src: tela("prateleira_etiqueta"),
										alt: ""
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: row.nome }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("small", { children: ["Qtd. ", row.qty] }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("small", { children: [
										"Médio ",
										formatF(row.avg),
										" · ",
										formatF(row.total)
									] }),
									lack > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("small", {
										className: "is-hot",
										children: ["Falta ×", lack]
									}),
									coming > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("small", { children: ["A caminho: ", coming] })
								]
							})
						]
					}, row.id);
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "gf-shelf-tip",
				children: "Sem peça na prateleira, o carro não entra no elevador."
			}),
			empty && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "gf-slip",
				children: "A prateleira está vazia."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", {
				className: "gf-scrap",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
					className: "gf-clip-bg",
					src: tela("tela_moldura_painel"),
					alt: ""
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: "Vender sucata" }),
					scrap && scrap.qty > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: scrap.nome }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stepper, {
							value: qty,
							min: 1,
							max: scrap.qty,
							label: "Quantidade",
							onChange: setQty
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: formatF(pay) }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArtBtn, {
							kind: "primario",
							disabled: busy,
							onClick: () => onAct({
								type: "SELL_SCRAP",
								material: scrap.id,
								qty: Math.min(qty, scrap.qty)
							}),
							children: "Vender sucata"
						})
					] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArtBtn, {
						kind: "desativado",
						disabled: true,
						children: "Vender sucata"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "A loja da oficina revende sucata 10% mais cara." }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArtBtn, {
						kind: "secundario",
						onClick: onOrder,
						children: "Pedir peças"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArtBtn, {
						kind: "secundario",
						onClick: onMap,
						children: "Abrir mapa"
					})
				] })]
			})
		]
	});
}
var COLS = [
	{
		status: "waiting_materials",
		title: "Aguardando",
		ticket: "vermelho"
	},
	{
		status: "queued",
		title: "Na fila",
		ticket: "cinza"
	},
	{
		status: "in_progress",
		title: "Em produção",
		ticket: "laranja"
	},
	{
		status: "ready",
		title: "Pronto",
		ticket: "verde"
	}
];
export function ElevadorTela({ state, pack, busy, onAct, onMap, onQuadro, onZap, onClose }) {
	const recs = state.receivables.filter((item) => item.status === "open" || item.status === "defaulted");
	const jobs = state.jobs.filter((job) => job.status !== "delivered" && job.status !== "paid" && job.status !== "defaulted");
	const first = jobs.find((job) => job.status === "in_progress") ?? jobs[0];
	const [pick, setPick] = useState(first?.id ?? recs[0]?.id ?? "");
	const job = state.jobs.find((item) => item.id === pick);
	const rec = recs.find((item) => item.id === pick);
	const workers = [{
		id: "teo",
		nome: "Téo"
	}, ...state.employees.map((person) => ({
		id: person.id,
		nome: workerNome(pack, person.id)
	}))];
	const gone = away(state);
	const waiting = state.leads.filter((lead) => lead.status === "pending");
	const empty = jobs.length + recs.length + waiting.length === 0;
	const showCar = jobs.length > 0 || recs.length > 0 || waiting.length > 0;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Tela, {
		title: "Elevador",
		bg: "/assets/gf/v2/telas/fundo_oficina.webp?v=21",
		bgHalf: "/assets/gf/v2/telas/fundo_oficina_half.webp?v=21",
		focus: "50% 50%",
		mark: "is-oficina",
		onClose,
		children: [
			gone && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "gf-away",
				children: "Trabalhar só na oficina."
			}),
			showCar && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "gf-cover",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
					className: "gf-car",
					src: tela("elevador_moto"),
					alt: ""
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", {
				className: "gf-clip gf-bay-board",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "gf-bay-list",
						children: [COLS.map((col) => {
							const list = state.jobs.filter((item) => item.status === col.status);
							if (list.length === 0) return null;
							return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: col.title }),
								list.slice(0, 2).map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									className: pick === item.id ? "is-on" : "",
									onClick: () => setPick(item.id),
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
										serviceNome$1(pack, item.service),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("small", {
											className: isLate(state, item.dueWeek, item.dueDay) ? "is-hot" : void 0,
											children: ["Entrega ", dueLabel(item.dueWeek, item.dueDay), isLate(state, item.dueWeek, item.dueDay) ? " · atrasado" : ""]
										})
									] })
								}, item.id)),
								list.length > 2 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("small", { children: ["+", list.length - 2] })
							] }, col.status);
						}), recs.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: "A receber" }),
							recs.slice(0, 2).map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								className: pick === item.id ? "is-on" : "",
								onClick: () => setPick(item.id),
								children: formatF(item.value)
							}, item.id))
						] })]
					}),
					nextLift(state) && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "gf-bay-need",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Baia sem elevador. A reforma abre o espaço, não traz o elevador." }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "button",
								disabled: busy,
								onClick: () => onAct({ type: "BUY_FITTING", fitting: "elevador" }),
								children: ["Comprar elevador · ", formatF(nextLift(state).cost)]
							})
						]
					}),
					waiting.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "gf-bay-wait",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "O carro fica na espera até o cliente aceitar. Aí sobe no elevador e o pagamento vem no fim do serviço." }),
							waiting.map((lead) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
								clientNome$1(pack, lead.apparentType),
								" · ",
								serviceNome$1(pack, lead.service),
								" · resposta ",
								replyWhen$1(state, lead)
							] }, lead.id))
						]
					}),
					empty && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "gf-bay-empty",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Elevador vazio." }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								className: "gf-plain",
								onClick: onQuadro,
								children: "Ver pedidos"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								className: "gf-plain",
								onClick: onZap,
								children: "Abrir ZapDino"
							})
						]
					}),
					(job || rec) && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "gf-bay-detail",
						children: job ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Ficha, {
							job,
							state,
							pack,
							busy,
							gone,
							workers,
							onAct,
							onMap
						}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Cobranca, {
							rec,
							state,
							pack,
							busy,
							onAct
						})
					})
				]
			})
		]
	});
}
function Ficha({ job, state, pack, busy, gone, workers, onAct, onMap }) {
	const missing = missingMaterials(state, pack, job);
	const pct = job.apNeeded > 0 ? 100 * job.apDone / job.apNeeded : 0;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: serviceNome$1(pack, job.service) }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: ["Entrega ", dueLabel(job.dueWeek, job.dueDay)] }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: ["Quem trabalha", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
			"aria-label": "Quem trabalha",
			value: job.assignedTo,
			disabled: busy,
			onChange: (event) => onAct({
				type: "ASSIGN",
				jobId: job.id,
				worker: event.target.value
			}),
			children: workers.map((worker) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
				value: worker.id,
				children: worker.nome
			}, worker.id))
		})] }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Meter, {
			pct,
			label: "Andamento"
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
			job.apDone,
			" de ",
			job.apNeeded
		] }),
		job.status === "in_progress" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArtBtn, {
			kind: "primario",
			disabled: busy || gone || state.calendar.apLeft < 1,
			onClick: () => onAct({
				type: "WORK_JOB",
				jobId: job.id,
				ap: 1
			}),
			children: "Trabalhar −1 ⚡"
		}),
		job.status === "ready" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArtBtn, {
			kind: "primario",
			disabled: busy || gone,
			onClick: () => onAct({
				type: "DELIVER",
				jobId: job.id
			}),
			children: "Entregar"
		}),
		missing.map((row) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
				src: `/assets/gf/v2/pecas/peca_${row.material}.png?v=${Q$1}`,
				alt: "",
				width: 28,
				height: 28
			}),
			materialNome(pack, row.material),
			" ",
			row.have,
			"/",
			row.need
		] }, row.material)),
		missing.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArtBtn, {
			kind: "secundario",
			onClick: onMap,
			children: "Buscar na cidade"
		})
	] });
}
function Cobranca({ rec, state, pack, busy, onAct }) {
	const job = state.jobs.find((item) => item.id === rec.jobId);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: job ? serviceNome$1(pack, job.service) : "A receber" }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: formatF(rec.value) }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
			"Vence ",
			dueLabel(rec.dueWeek, rec.dueDay),
			rec.status === "defaulted" ? " · calote" : ""
		] }),
		rec.status === "defaulted" && !rec.collected && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArtBtn, {
			kind: "primario",
			disabled: busy || state.calendar.apLeft < 1,
			onClick: () => onAct({
				type: "COLLECT",
				receivableId: rec.id
			}),
			children: "Cobrar −1 ⚡"
		}),
		rec.status === "defaulted" && !rec.protested && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArtBtn, {
			kind: "secundario",
			disabled: busy || state.cash < 60,
			onClick: () => onAct({
				type: "PROTEST",
				receivableId: rec.id
			}),
			children: "Protestar ₣ 60"
		})
	] });
}
var ABAS = [
	{
		id: "caixa",
		nome: "Caixa",
		cor: "vermelha",
		ids: [
			"L01",
			"L02",
			"L03",
			"L04",
			"L05",
			"L09",
			"L10",
			"L21",
			"L27",
			"L30",
			"L32"
		]
	},
	{
		id: "clientes",
		nome: "Clientes",
		cor: "azul",
		ids: [
			"L11",
			"L12",
			"L18",
			"L19"
		]
	},
	{
		id: "dividas",
		nome: "Dívidas",
		cor: "verde",
		ids: [
			"L06",
			"L07",
			"L13",
			"L14",
			"L15",
			"L16",
			"L17",
			"L22",
			"L25",
			"L31"
		]
	},
	{
		id: "cofre",
		nome: "Cofre",
		cor: "amarela",
		ids: [
			"L08",
			"L20",
			"L23",
			"L24",
			"L26",
			"L28",
			"L29"
		]
	}
];
export function CadernoTela({ state, pack, busy, onAct, onClose }) {
	const known = pack.lessons.filter((lesson) => state.lessonsTriggered.includes(lesson.id));
	const firstAba = ABAS.find((item) => known.some((lesson) => item.ids.includes(lesson.id)))?.id ?? ABAS[0].id;
	const [aba, setAba] = useState(firstAba);
	const [pick, setPick] = useState(known[0]?.id ?? "");
	const grouped = known.filter((lesson) => ABAS.find((item) => item.id === aba)?.ids.includes(lesson.id));
	const list = grouped;
	const page = list.find((lesson) => lesson.id === pick) ?? list[0];
	const read = page ? state.flags[`read_${page.id}`] === true : false;
	const parts = page ? [
		[
			"estrela",
			"O caso",
			page.happened
		],
		[
			"balao",
			"O conceito",
			page.plain
		],
		[
			"conta",
			"A conta",
			page.math
		],
		[
			"lupa",
			"O sinal",
			page.detect
		],
		[
			"seta",
			"A decisão",
			page.instead
		]
	] : [];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Tela, {
		title: "Caderno do Pai",
		bg: "/assets/gf/v2/telas/bg_caderno.webp?v=28",
		focus: "50% 50%",
		mark: "is-caderno",
		onClose,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "gf-book",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
					className: "gf-book-skin",
					src: "/assets/gf/v2/telas/caderno_aberto_branco.png",
					alt: ""
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "gf-book-index",
					children: [
						known.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Ainda não tem página. O domingo e os recados escrevem sozinhos." }),
						known.length > 0 && list.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Essa aba ainda não tem página." }),
						list.map((lesson) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							className: page?.id === lesson.id ? "is-on" : "",
							onClick: () => setPick(lesson.id),
							children: [
								lesson.id,
								" · ",
								lesson.title,
								state.flags[`read_${lesson.id}`] === true ? "" : " · nova"
							]
						}, lesson.id)),
						page && parts.slice(0, 3).map(([icon, label, text]) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "gf-lesson",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
								src: tela(`caderno_icone_${icon}`),
								alt: ""
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("b", { children: [label, "."] }),
								" ",
								text.replaceAll("{nome}", state.player.name).replaceAll("{caixa}", formatF(state.cash)).replaceAll("{divida}", formatF(state.debts.reduce((sum, item) => sum + item.balance, 0)))
							] })]
						}, icon))
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("article", {
					className: "gf-book-page",
					children: page ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: page.title }),
						parts.slice(3).map(([icon, label, text]) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "gf-lesson",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
								src: tela(`caderno_icone_${icon}`),
								alt: ""
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("b", { children: [label, "."] }),
								" ",
								text.replaceAll("{nome}", state.player.name).replaceAll("{caixa}", formatF(state.cash)).replaceAll("{divida}", formatF(state.debts.reduce((sum, item) => sum + item.balance, 0)))
							] })]
						}, icon)),
						read ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
							className: "gf-stamp",
							src: tela("caderno_carimbo_lido"),
							alt: "Lido"
						}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArtBtn, {
							kind: "primario",
							disabled: busy,
							onClick: () => onAct({
								type: "READ_LESSON",
								id: page.id
							}),
							children: "Entendi!"
						})
					] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Escolhe uma página." })
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "gf-tabs",
					children: ABAS.map((item, index) => {
						const fresh = known.some((lesson) => item.ids.includes(lesson.id) && state.flags[`read_${lesson.id}`] !== true);
						const on = aba === item.id;
						return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							className: on ? "is-on gf-plain" : "gf-plain",
							onClick: () => {
								setAba(item.id);
								const next = known.find((lesson) => item.ids.includes(lesson.id));
								setPick(next?.id ?? "");
							},
							"aria-label": item.nome,
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
									src: `/assets/gf/v2/telas/aba_${item.cor}_${on ? "ativa" : "normal"}.png`,
									alt: ""
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("b", { children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("em", { children: index + 1 }),
									item.nome
								] }),
								fresh && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", {})
							]
						}, item.id);
					})
				})
			]
		})
	});
}
export function CofreTela({ state, pack, busy, onAct, onClose }) {
	const [draft, setDraft] = useState({
		cofrinho: 100,
		tesouro: 100,
		fundo: 100
	});
	const [pct, setPct] = useState(state.savings.autoDepositPct);
	const [simPot, setSimPot] = useState("cofrinho");
	const [simValue, setSimValue] = useState(100);
	const [simWeeks, setSimWeeks] = useState(8);
	const fundoOpen = state.garage.level >= 3 && state.calendar.act >= 3;
	const pots = [
		{
			id: "cofrinho",
			nome: "Cofre do Distrito",
			note: "Resgate na hora.",
			file: "cofre_pote_cofrinho"
		},
		{
			id: "tesouro",
			nome: "Tesouro do Distrito",
			note: "O resgate cai no domingo.",
			file: "cofre_pote_tesouro"
		},
		{
			id: "fundo",
			nome: "Fundo Faixa",
			note: "Rende entre −1,5% e +2% por semana.",
			file: "cofre_pote_fundo"
		}
	];
	const weekly = (fixedTotal?.(state.garage.level, pack, state.fixedRecurring ?? [], state.calendar.week) ?? 0) + (state.employees ?? []).reduce((sum, person) => sum + (person.salary || 0), 0);
	const saved = state.savings.cofrinho + state.savings.tesouro + state.savings.fundo;
	const goal = pack.balance.freedom.reserveWeeks;
	const weeks = weekly > 0 ? saved / Math.max(1, weekly) : 0;
	const rate = pack.savingsProducts.find((item) => item.id === simPot)?.bps ?? 0;
	let shown = simValue;
	for (let week = 0; week < simWeeks; week += 1) shown += bps(shown, rate);
	const pending = state.savings.pendingWithdraw.reduce((sum, item) => sum + item.value, 0);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Tela, {
		title: "Cofre",
		bg: tela("bg_cofre"),
		focus: "30% 50%",
		onClose,
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "gf-coftip",
				children: "Caixa da oficina. Boleto e empréstimo ficam no BANCO da cidade."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "gf-pots",
				children: pots.map((pot) => {
					const locked = pot.id === "fundo" && !fundoOpen;
					const balance = state.savings[pot.id];
					const amount = draft[pot.id] ?? 0;
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
						className: locked ? "is-lock" : void 0,
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
								src: tela(pot.file),
								alt: ""
							}),
							locked && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
								className: "gf-lock",
								src: tela("tela_selo_cadeado"),
								alt: ""
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: pot.nome }),
							locked ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Abre no ato 3 com a oficina nível 3." }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: pot.note }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: ["Saldo ", formatF(balance)] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stepper, {
									value: amount,
									min: 0,
									max: 99999,
									label: `Valor no ${pot.nome}`,
									onChange: (value) => setDraft((prev) => ({
										...prev,
										[pot.id]: value
									}))
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArtBtn, {
									kind: "primario",
									disabled: busy || amount <= 0 || state.cash < amount,
									onClick: () => onAct({
										type: "SAVE",
										product: pot.id,
										value: amount
									}),
									children: "Guardar"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArtBtn, {
									kind: "secundario",
									disabled: busy || amount <= 0 || balance < amount,
									onClick: () => onAct({
										type: "WITHDRAW",
										product: pot.id,
										value: amount
									}),
									children: "Tirar"
								})
							] })
						]
					}, pot.id);
				})
			}),
			pending > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "gf-coftip",
				children: [formatF(pending), " chega no domingo."]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "gf-thermo",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
						src: tela("cofre_termometro_tubo"),
						alt: ""
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", {
						style: { ["--gf-fill"]: `${Math.max(0, Math.min(100, weeks / goal * 100))}%` },
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
							src: tela("cofre_termometro_preenchimento"),
							alt: ""
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("b", { children: [
						Math.floor(weeks),
						" de ",
						goal,
						" semanas guardadas"
					] })
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", {
				className: "gf-calc",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [
						"Guardar sozinho: ",
						pct,
						"%",
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							type: "range",
							min: 0,
							max: pack.balance.savingsAutoMax,
							step: 5,
							value: pct,
							"aria-label": "Depósito automático",
							onChange: (event) => setPct(Number(event.target.value)),
							onPointerUp: () => {
								if (pct !== state.savings.autoDepositPct) onAct({
									type: "SET_AUTODEPOSIT",
									pct
								});
							}
						})
					] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "A cada pagamento recebido, essa parte vai sozinha para o cofre." }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "gf-calc-face",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
							src: tela("cofre_calculadora"),
							alt: ""
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "gf-visor",
							children: [
								formatF(simValue),
								" em ",
								simWeeks,
								" sem. fica ",
								formatF(shown),
								"."
							]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stepper, {
						value: simValue,
						min: 0,
						max: 5e3,
						label: "Valor da conta",
						onChange: setSimValue
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stepper, {
						value: simWeeks,
						min: 1,
						max: 52,
						label: "Semanas da conta",
						onChange: setSimWeeks
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "gf-sign",
						children: pots.filter((pot) => pot.id !== "fundo" || fundoOpen).map((pot) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArtBtn, {
							kind: simPot === pot.id ? "primario" : "secundario",
							onClick: () => setSimPot(pot.id),
							children: pot.nome.split(" ")[0]
						}, pot.id))
					})
				]
			}),
			saved <= 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "gf-coftip is-empty",
				children: "Cofre vazio. Guarde um pouco a cada pagamento."
			})
		]
	});
}
export function QuartoTela({ state, pack, busy, onAct, onFogao, onClose }) {
	const gone = away(state);
	const energy = state.clock?.energy ?? 0;
	const hunger = 100 - hungerOf(state);
	const thirst = 100 - thirstOf(state);
	const now = partsOf(state.clock?.t ?? pack.time.startT);
	const tubes = [
		{
			nome: "Fome",
			pct: hunger,
			file: "quarto_medidor_laranja",
			low: hunger < 30
		},
		{
			nome: "Sede",
			pct: thirst,
			file: "quarto_medidor_azul",
			low: thirst < 30
		},
		{
			nome: "Energia",
			pct: Math.max(0, Math.min(100, energy)),
			file: "quarto_medidor_amarelo",
			low: energy <= 15
		}
	];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Tela, {
		title: "Hora de dormir",
		bg: tela("bg_quarto"),
		focus: "30% 50%",
		onClose,
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "gf-clockface",
				children: [
					String(now.hour).padStart(2, "0"),
					":",
					String(now.minute).padStart(2, "0")
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "gf-tubes",
				children: tubes.map((tube) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: tube.low ? "is-low" : void 0,
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
							src: tela("quarto_medidor_tubo"),
							alt: ""
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", {
							style: { ["--gf-fill"]: `${tube.pct}%` },
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
								src: tela(tube.file),
								alt: ""
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("b", { children: [
							tube.nome,
							" ",
							Math.round(tube.pct)
						] })
					]
				}, tube.nome))
			}),
			(0, import_jsx_runtime.jsxs)("p", {
				className: "gf-bednote",
				children: [
					(hunger < 30 || thirst < 30) ? [
						state.player.name || "Téo",
						" tá com fome. Vai no fogão! "
					] : null,
					(0, import_jsx_runtime.jsx)(ArtBtn, {
						kind: "secundario",
						onClick: onFogao,
						children: "Ir ao fogão"
					})
				]
			}),
			gone && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "gf-bednote",
				children: "Dormir só na oficina. Volte pelo portão."
			}),
			energy >= pack.time.energy.max && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "gf-bednote",
				children: "Energia cheia. Dormir agora só passa o tempo."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "gf-alarms",
				children: [[
					1,
					2,
					3,
					4,
					6,
					8,
					10,
					12
				].map((hours) => {
					const wake = (state.clock?.t ?? 0) + hours * 60;
					const when = partsOf(wake);
					const gain = Math.max(0, Math.min(pack.time.energy.max, energy + pack.time.energy.sleepPerHour * hours) - energy);
					const shown = Math.round(gain * 10) / 10;
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						disabled: busy || gone,
						onClick: () => onAct({
							type: "SLEEP",
							hours
						}),
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
								src: tela("quarto_despertador"),
								alt: ""
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("b", { children: [hours, "h"] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("small", { children: [
								"acorda ",
								String(when.hour).padStart(2, "0"),
								":",
								String(when.minute).padStart(2, "0")
							] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("small", { children: ["+⚡ ", shown] })
						]
					}, hours);
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: "is-go gf-sleep6",
					disabled: busy || gone,
					onClick: () => onAct({ type: "END_DAY" }),
					children: "Dormir até 6h"
				})]
			})
		]
	});
}

function NeedLiquid({ icon, label, left, tone }) {
  const pct = Math.max(0, Math.min(100, left));
  const shown = Math.round(pct);
  const low = shown <= 25;
  const empty = shown <= 0;
  const [on, setOn] = useState(false);
  const warn = empty
    ? tone === "hunger"
      ? "Está faminto. Sem comer, a saúde cai 1% a cada 15 min."
      : "Está com sede. Sem beber, a saúde cai 1% a cada 15 min."
    : low
      ? tone === "hunger" ? "Fome baixa." : "Sede baixa."
      : `${label} ${shown}%.`;
  return (
    <span
      className={`gf-liquid is-${tone}${low ? " is-low" : ""}${empty ? " is-empty" : ""}`}
      onMouseEnter={() => setOn(true)}
      onMouseLeave={() => setOn(false)}
    >
      <img className="gf-liquid-ico" src={icon} alt={label} />
      <span className="gf-liquid-track">
        <img src={tela("hud_xp_trilho")} alt="" />
        <i style={{ width: `${pct * 0.897}%` }}>
          <img src={tela("hud_xp_preenchimento")} alt="" />
        </i>
        <span className="gf-liquid-pct">{shown}%</span>
      </span>
      <span className={`gf-liquid-warn${on ? " is-on" : ""}`} role="tooltip">{warn}</span>
    </span>
  );
}

export function FogaoTela({ state, busy, onAct, onClose }) {
  const bag = readPantry(state.flags);
  const rank = levelOf(xpOf(state));
  const gone = away(state);
  const [steam, setSteam] = useState(0);
  const [pick, setPick] = useState(null);
  const [tab, setTab] = useState("receitas");
  const [page, setPage] = useState(0);
  const listRef = useRef(null);
  const [listH, setListH] = useState(180);
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const read = () => setListH(el.clientHeight || 180);
    read();
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const picked = RECIPES.find((recipe) => recipe.id === pick) ?? null;
  const pickedOut = picked ? FOODS.find((food) => food.id === picked.out) : null;
  const pickedMissing = picked ? Object.entries(picked.need).some(([id, need]) => (bag[id] ?? 0) < (need ?? 0)) : false;
  const pickedLow = picked ? rank.level < picked.level : false;
  const pickedWhy = !picked ? null : gone ? "Você está na cidade." : pickedLow ? `Precisa do nível ${LEVELS[picked.level]?.nome ?? picked.level}.` : pickedMissing ? "Falta ingrediente na despensa." : null;
  const pantry = FOODS.filter((food) => (bag[food.id] ?? 0) > 0);
  const items = tab === "despensa" ? pantry : RECIPES;
  const per = Math.max(1, Math.floor(Math.max(36, listH - 78) / 36));
  const pages = Math.max(1, Math.ceil(items.length / per));
  const safe = Math.min(page, pages - 1);
  const slice = items.slice(safe * per, safe * per + per);
  return (
    <Tela title="Fogão" bg={tela("bg_fogao")} focus="70% 50%" onClose={onClose} mark="is-fogao">
      <div className="gf-cooktop" aria-label="Fome e sede">
        <span className="gf-xpseal" title={rank.nome}>
          <img src={tela("hud_xp_selo_nivel")} alt="" />
          <b>{rank.level + 1}</b>
        </span>
        <NeedLiquid icon="/assets/gf/v2/hud/icon_fome.png" label="Fome" left={100 - hungerOf(state)} tone="hunger" />
        <NeedLiquid icon="/assets/gf/v2/hud/icon_sede.png" label="Sede" left={100 - thirstOf(state)} tone="thirst" />
      </div>
      <div className="gf-fogao-pair">
        <div className="gf-moldura" style={{ "--ar": String(MOLDURA_FOGAO.aspect), "--mold": `url("${MOLDURA_FOGAO.src}")` }}>
          <div ref={listRef} className="gf-conteudo" style={{ left: `${MOLDURA_FOGAO.conteudo.x}%`, top: `${MOLDURA_FOGAO.conteudo.y}%`, width: `${MOLDURA_FOGAO.conteudo.w}%`, height: `${MOLDURA_FOGAO.conteudo.h}%` }}>
            <div className="gf-moldura-tabs">
              <button type="button" className={tab === "receitas" ? "is-on" : ""} onClick={() => { setTab("receitas"); setPage(0); }}>Receitas</button>
              <button type="button" className={tab === "despensa" ? "is-on" : ""} onClick={() => { setTab("despensa"); setPage(0); }}>Despensa</button>
            </div>
            <div className="gf-moldura-grid is-rows">
              {slice.map((item) => {
                if (tab === "despensa") {
                  const food = item;
                  return (
                    <button key={food.id} type="button" className={`gf-mrow${pick === food.id ? " is-on" : ""}`} onClick={() => setPick(food.id)}>
                      <b>{food.nome}</b>
                      <small>{bag[food.id] ?? 0}</small>
                    </button>
                  );
                }
                const recipe = item;
                const out = FOODS.find((food) => food.id === recipe.out);
                return (
                  <button key={recipe.id} type="button" className={`gf-mrow${pick === recipe.id ? " is-on" : ""}`} onClick={() => setPick(recipe.id)}>
                    <b>{recipe.nome}</b>
                    <small>{out ? `+${out.energy} energia` : ""}</small>
                  </button>
                );
              })}
            </div>
            {pages > 1 && (
              <div className="gf-moldura-pages">
                <button type="button" className="gf-turn is-prev" aria-label="Anterior" disabled={safe === 0} onClick={() => setPage(safe - 1)}>‹</button>
                <span>{safe + 1}/{pages}</span>
                <button type="button" className="gf-turn is-next" aria-label="Próxima" disabled={safe >= pages - 1} onClick={() => setPage(safe + 1)}>›</button>
              </div>
            )}
            {tab === "despensa" && pick && (bag[pick] ?? 0) > 0 && (
              <button type="button" className="is-go" disabled={busy || gone} onClick={() => onAct({ type: "EAT", food: pick })}>Comer</button>
            )}
          </div>
        </div>
        <div className="gf-moldura" style={{ "--ar": String(MOLDURA_FOGAO.aspect), "--mold": `url("${MOLDURA_FOGAO.src}")` }}>
          <div className="gf-conteudo" style={{ left: `${MOLDURA_FOGAO.conteudo.x}%`, top: `${MOLDURA_FOGAO.conteudo.y}%`, width: `${MOLDURA_FOGAO.conteudo.w}%`, height: `${MOLDURA_FOGAO.conteudo.h}%` }}>
            {!picked || tab !== "receitas" ? <p className="gf-moldura-sub">Escolha uma receita.</p> : (
              <>
                <b className="gf-moldura-sub">{picked.nome}</b>
                {Object.entries(picked.need).map(([rid, need]) => (
                  <p key={rid} className="gf-moldura-sub">{FOODS.find((food) => food.id === rid)?.nome ?? rid} {bag[rid] ?? 0}/{need}</p>
                ))}
                <p className="gf-moldura-sub">+{pickedOut?.hunger ?? 0} fome · +{pickedOut?.xp ?? 0} xp</p>
                {pickedWhy && <p className="gf-moldura-sub">{pickedWhy}</p>}
                <button type="button" className="is-go" disabled={busy || !!pickedWhy} onClick={() => { setSteam((n) => n + 1); onAct({ type: "COOK", recipe: picked.id }); }}>Cozinhar</button>
              </>
            )}
          </div>
        </div>
      </div>
      {steam > 0 && <img className="gf-steam" src={tela(`fogao_vapor_${(steam % 3) + 1}`)} alt="" />}
    </Tela>
  );
}


export function AjustesPainel({ tips, dad, embed, trap, onTips, onDad, onClose, onWipe }) {
	const [sound, setSound] = useState(() => {
		try {
			return localStorage.getItem("gf-sound") === "1";
		} catch {
			return false;
		}
	});
	const [speed, setSpeed] = useState(() => {
		try {
			return localStorage.getItem("gf-type-ms") ?? "16";
		} catch {
			return "16";
		}
	});
	const [ask, setAsk] = useState(false);
	const [hold, setHold] = useState(0);
	const raf = useRef(0);
	useEffect(() => () => {
		if (trap) trap.current = null;
	}, [trap]);
	function save(key, value) {
		try {
			localStorage.setItem(key, value);
		} catch {}
		window.dispatchEvent(new Event("gf-settings"));
	}
	function stopHold() {
		cancelAnimationFrame(raf.current);
		setHold(0);
	}
	function startHold() {
		const start = performance.now();
		const tick = (now) => {
			const next = Math.min(1, (now - start) / 2e3);
			setHold(next);
			if (next >= 1) {
				onWipe();
				return;
			}
			raf.current = requestAnimationFrame(tick);
		};
		raf.current = requestAnimationFrame(tick);
	}
	const rows = [
		{
			label: "Dicas do Pai",
			state: dad ? "Ligadas" : "Desligadas",
			on: dad,
			toggle: () => onDad(!dad)
		},
		{
			label: "Palavras difíceis",
			state: tips ? "Explicar" : "Não explicar",
			on: tips,
			toggle: () => {
				onTips(!tips);
				save("gf-tips", tips ? "0" : "1");
			}
		},
		{
			label: "Som",
			state: sound ? "Ligado" : "Desligado",
			on: sound,
			toggle: () => {
				const next = !sound;
				setSound(next);
				save("gf-sound", next ? "1" : "0");
			}
		}
	];
	if (trap) trap.current = ask ? () => {
		setAsk(false);
		return true;
	} : null;
	const body = /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
			id: "gf-ajustes-title",
			children: "Ajustes"
		}),
		rows.map((row) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
			type: "button",
			className: "gf-switch",
			onClick: row.toggle,
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [row.label, /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: row.state })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
				src: tela(row.on ? "ajustes_chave_ligada" : "ajustes_chave_desligada"),
				alt: ""
			})]
		}, row.label)),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Brilho da carta" }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "gf-sign",
			children: [
				["16", "Normal"],
				["48", "Devagar"],
				["0", "De uma vez"]
			].map(([value, label]) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArtBtn, {
				kind: speed === value ? "primario" : "secundario",
				onClick: () => {
					setSpeed(value);
					save("gf-type-ms", value);
				},
				children: label
			}, value))
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Ver a fachada" }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "gf-sign",
			children: [0, 1, 2, 3, 4, 5].map((value) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArtBtn, {
				kind: "secundario",
				onClick: () => {
					try {
						if (value === 0) localStorage.removeItem("gf-fachada-preview");
						else localStorage.setItem("gf-fachada-preview", String(value));
					} catch {}
					window.dispatchEvent(new Event("gf-fachada-preview"));
				},
				children: value === 0 ? "Jogo" : String(value)
			}, value))
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("small", {
			className: "gf-ver",
			children: ["Versão ", version_default.version]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
			type: "button",
			className: "gf-danger-btn",
			onClick: () => setAsk(true),
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
				src: tela(ask ? "ajustes_botao_perigo_aberto" : "ajustes_botao_perigo_fechado"),
				alt: ""
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Novo jogo" })]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArtBtn, {
			kind: "secundario",
			onClick: () => {
				window.location.assign("/");
			},
			children: "Voltar ao menu"
		})
	] });
	const wipe = ask && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "gf-wipe",
		role: "alertdialog",
		"aria-labelledby": "gf-wipe-title",
		onClick: (event) => {
			if (event.target === event.currentTarget) setAsk(false);
		},
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
				id: "gf-wipe-title",
				children: "Começar do zero?"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Um jogo novo apaga esta oficina. O que está salvo some." }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArtBtn, {
				kind: "primario",
				onClick: () => setAsk(false),
				children: "Continuar jogando"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
				type: "button",
				className: "gf-hold",
				onPointerDown: startHold,
				onPointerUp: stopHold,
				onPointerLeave: stopHold,
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", { style: { width: `${hold * 100}%` } }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Apagar e recomeçar" })]
			})
		] })
	});
	if (embed) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "gf-ajustes-embed",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "gf-ajustes-body",
			children: body
		}), wipe]
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "gf-ajustes",
		onClick: (event) => {
			if (event.target === event.currentTarget) onClose();
		},
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "gf-ajustes-card",
			role: "dialog",
			"aria-modal": "true",
			"aria-labelledby": "gf-ajustes-title",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
					className: "gf-ajustes-bg",
					src: tela("ajustes_painel"),
					alt: ""
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: "gf-tela-x",
					"aria-label": "Fechar",
					onClick: onClose,
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
						src: tela("tela_btn_fechar"),
						alt: ""
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "gf-ajustes-body",
					children: body
				})
			]
		}), wipe]
	});
}
var SPOTS = [
	{
		id: "quadro_clientes",
		file: "hs_quadro_clientes.png",
		x: 1.5,
		y: 30,
		w: 13.9,
		h: 24,
		label: "Clientes",
		tip: "Os pedidos que chegaram.",
		side: "right"
	},
	{
		id: "prateleira",
		file: "hs_prateleira.png",
		x: 3.6,
		y: 59,
		w: 16.7,
		h: 29.5,
		label: "Peças",
		tip: "A prateleira. Sem peça aqui, o carro não sobe no elevador.",
		side: "right"
	},
	{
		id: "elevador",
		file: "hs_elevador_vazio.png",
		x: 27,
		y: 51,
		w: 20.4,
		h: 38.5,
		label: "Carro",
		tip: "O elevador. O carro sobe aqui.",
		side: "right"
	},
	{
		id: "caderno",
		file: "hs_caderno.png",
		x: 47.5,
		y: 48.7,
		w: 8.2,
		h: 13.7,
		label: "Caderno",
		tip: "As anotações do Téo.",
		side: "right"
	},
	{
		id: "mesa_cofre",
		file: "hs_mesa_cofre.png",
		x: 49.8,
		y: 62.5,
		w: 11.2,
		h: 25,
		label: "Cofre",
		tip: "O caixa da oficina. Boleto é no banco.",
		side: "left"
	},
	{
		id: "cama",
		file: "hs_cama.png",
		x: 61,
		y: 62.4,
		w: 12.9,
		h: 19.1,
		label: "Cama",
		tip: "Dormir. Escolhe as horas ou vai até as 6h.",
		side: "left"
	},
	{
		id: "fogao",
		file: "hs_fogao.png",
		x: 74,
		y: 60.3,
		w: 5.6,
		h: 22.4,
		label: "Fogão",
		tip: "Cozinhar e a despensa.",
		side: "left"
	},
	{
		id: "caixa",
		file: "hs_caixa.png",
		x: 79.7,
		y: 70.2,
		w: 5.8,
		h: 11.4,
		label: "Caixa",
		tip: "O saldo e o que entrou e saiu.",
		side: "left"
	},
	{
		id: "telefone",
		file: "hs_telefone.png",
		x: 80.3,
		y: 44.5,
		w: 4.5,
		h: 10,
		label: "Telefone",
		tip: "Recados e ofertas.",
		side: "left"
	},
	{
		id: "portao",
		file: "hs_portao.png",
		x: 85.6,
		y: 44,
		w: 12.4,
		h: 36,
		label: "Cidade",
		tip: "O portão. Sai pra rua.",
		side: "left"
	}
];
