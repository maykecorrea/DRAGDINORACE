"""Recorta telas e a central de entrega. Fundo branco sai sem auréola escura."""
from __future__ import annotations

import os
from collections import deque

import numpy as np
from PIL import Image

RAW = "/tmp/telas/telas-oficina/raw"
HS = "/tmp/telas/telas-oficina/hs-split"
PECAS = "/tmp/telas/telas-oficina/pecas-originais"
ENT = "/tmp/entrega/entrega/raw"
OUT = "/workspace/public/assets/gf/v2/telas"
HUB = "/workspace/public/assets/gf/v2/hub"
PECA_OUT = "/workspace/public/assets/gf/v2/pecas"
ENT_OUT = "/workspace/public/assets/gf/v2/entrega"
PHONE = "/workspace/public/assets/gf/v2/celular"

# (arquivo, nomes na ordem de leitura, (largura, altura); 0 = justo)
SHEETS: list[tuple[str, list[tuple[str, int, int]], str]] = [
    ("tela_btn_fechar.jpg", [("tela_btn_fechar.png", 256, 256)], "solid"),
    ("tela_moldura_painel.jpg", [("tela_moldura_painel.png", 1200, 0)], "solid"),
    ("tela_botoes.jpg", [
        ("tela_btn_primario.png", 0, 200),
        ("tela_btn_secundario.png", 0, 200),
        ("tela_btn_desativado.png", 0, 200),
    ], "solid"),
    ("tela_placa_titulo.jpg", [("tela_placa_titulo.png", 0, 260)], "solid"),
    ("tela_selo_cadeado.jpg", [("tela_selo_cadeado.png", 256, 256)], "solid"),
    ("tela_barra.jpg", [("tela_barra_trilho.png", 0, 140), ("tela_barra_preenchimento.png", 0, 61)], "solid"),
    ("tela_slider.jpg", [("tela_slider_trilho.png", 0, 120), ("tela_slider_pino.png", 160, 160)], "solid"),
    ("tela_stepper.jpg", [
        ("tela_stepper_menos.png", 160, 160),
        ("tela_stepper_campo.png", 0, 140),
        ("tela_stepper_mais.png", 160, 160),
    ], "solid"),
    ("quadro_bilhetes.jpg", [
        ("quadro_bilhete_creme.png", 480, 560),
        ("quadro_bilhete_amarelo.png", 480, 560),
        ("quadro_bilhete_azul.png", 480, 560),
    ], "solid"),
    ("quadro_prancheta.jpg", [("quadro_prancheta.png", 0, 960)], "solid"),
    ("prateleira_etiqueta.jpg", [("prateleira_etiqueta.png", 0, 220)], "solid"),
    ("prateleira_selo_ferrugem.jpg", [("prateleira_selo_ferrugem.png", 200, 200)], "solid"),
    ("elevador_carro.jpg", [("elevador_carro.png", 0, 680)], "solid"),
    ("elevador_tickets.jpg", [
        ("elevador_ticket_vermelho.png", 300, 400),
        ("elevador_ticket_cinza.png", 300, 400),
        ("elevador_ticket_laranja.png", 300, 400),
        ("elevador_ticket_verde.png", 300, 400),
        ("elevador_ticket_dourado.png", 300, 400),
    ], "solid"),
    ("caderno_abas.jpg", [
        ("caderno_aba_vermelha.png", 180, 300),
        ("caderno_aba_azul.png", 180, 300),
        ("caderno_aba_verde.png", 180, 300),
        ("caderno_aba_amarela.png", 180, 300),
    ], "solid"),
    ("caderno_icones.jpg", [
        ("caderno_icone_estrela.png", 160, 160),
        ("caderno_icone_balao.png", 160, 160),
        ("caderno_icone_conta.png", 160, 160),
        ("caderno_icone_lupa.png", 160, 160),
        ("caderno_icone_seta.png", 160, 160),
    ], "solid"),
    ("caderno_carimbo_lido.jpg", [("caderno_carimbo_lido.png", 320, 320)], "ink"),
    ("ajustes_painel.jpg", [("ajustes_painel.png", 0, 1000)], "solid"),
    ("ajustes_chaves.jpg", [
        ("ajustes_chave_ligada.png", 240, 140),
        ("ajustes_chave_desligada.png", 240, 140),
    ], "solid"),
    ("ajustes_botao_perigo.jpg", [
        ("ajustes_botao_perigo_fechado.png", 320, 320),
        ("ajustes_botao_perigo_aberto.png", 320, 320),
    ], "solid"),
    ("cofre_potes.jpg", [
        ("cofre_pote_cofrinho.png", 420, 560),
        ("cofre_pote_tesouro.png", 420, 560),
        ("cofre_pote_fundo.png", 420, 560),
    ], "glass"),
    ("cofre_termometro.jpg", [
        ("cofre_termometro_tubo.png", 0, 816),
        ("cofre_termometro_preenchimento.png", 0, 684),
    ], "glass"),
    ("cofre_calculadora.jpg", [("cofre_calculadora.png", 600, 0)], "solid"),
    ("quarto_medidor.jpg", [
        ("quarto_medidor_tubo.png", 0, 306),
        ("quarto_medidor_laranja.png", 0, 256),
        ("quarto_medidor_azul.png", 0, 256),
        ("quarto_medidor_amarelo.png", 0, 256),
    ], "glass"),
    ("quarto_despertador.jpg", [("quarto_despertador.png", 300, 340)], "solid"),
    ("fogao_receita.jpg", [("fogao_receita.png", 0, 720)], "solid"),
    ("fogao_vapor.jpg", [
        ("fogao_vapor_1.png", 300, 300),
        ("fogao_vapor_2.png", 300, 300),
        ("fogao_vapor_3.png", 300, 300),
    ], "solid"),
    ("hud_xp_barra.jpg", [
        ("hud_xp_trilho.png", 0, 80),
        ("hud_xp_preenchimento.png", 0, 46),
        ("hud_xp_selo_nivel.png", 160, 160),
    ], "solid"),
]

ENTREGA: list[tuple[str, list[tuple[str, int, int]], str]] = [
    ("personagem_atendente.jpg", [("personagem_atendente.png", 0, 900)], "solid"),
    ("personagem_entregador_dinoturbo.jpg", [("personagem_entregador_dinoturbo.png", 0, 900)], "solid"),
    ("moto_dinoturbo.jpg", [("moto_dinoturbo.png", 0, 420)], "solid"),
    ("dinodrone.jpg", [("dinodrone.png", 512, 512)], "solid"),
    ("entrega_cards_opcao.jpg", [
        ("entrega_card_turbo.png", 520, 760),
        ("entrega_card_drone.png", 520, 760),
    ], "solid"),
    ("entrega_icones.jpg", [
        ("entrega_icone_moto.png", 160, 160),
        ("entrega_icone_drone.png", 160, 160),
        ("entrega_icone_caixa.png", 160, 160),
        ("entrega_icone_perdida.png", 160, 160),
        ("entrega_icone_relogio.png", 160, 160),
        ("entrega_icone_caixas.png", 160, 160),
    ], "solid"),
    ("entrega_trilho_rota.jpg", [
        ("entrega_trilho.png", 0, 120),
        ("entrega_pino.png", 160, 160),
        ("entrega_moldura.png", 0, 0),
    ], "mixed"),
    ("app_central_entrega.jpg", [("app_central_entrega.png", 256, 256)], "solid"),
]

BGS = [
    "bg_quadro_clientes.jpg",
    "bg_prateleira.jpg",
    "bg_elevador.jpg",
    "bg_caderno.jpg",
    "bg_cofre.jpg",
    "bg_quarto.jpg",
    "bg_fogao.jpg",
]


def components(mask: np.ndarray, min_area: int) -> list[tuple[int, int, int, int, int]]:
    h, w = mask.shape
    seen = np.zeros((h, w), dtype=bool)
    found: list[tuple[int, int, int, int, int]] = []
    ys, xs = np.where(mask & ~seen)
    for y, x in zip(ys.tolist(), xs.tolist()):
        if seen[y, x]:
            continue
        q = deque([(y, x)])
        seen[y, x] = True
        minx = maxx = x
        miny = maxy = y
        area = 0
        while q:
            cy, cx = q.popleft()
            area += 1
            minx = min(minx, cx)
            maxx = max(maxx, cx)
            miny = min(miny, cy)
            maxy = max(maxy, cy)
            for ny, nx in ((cy - 1, cx), (cy + 1, cx), (cy, cx - 1), (cy, cx + 1)):
                if 0 <= ny < h and 0 <= nx < w and mask[ny, nx] and not seen[ny, nx]:
                    seen[ny, nx] = True
                    q.append((ny, nx))
        if area >= min_area:
            found.append((area, minx, miny, maxx, maxy))
    found.sort(key=lambda box: (box[4] // 70, box[1]))
    return merge_near(found)


def merge_near(boxes: list[tuple[int, int, int, int, int]], gap: int = 36) -> list[tuple[int, int, int, int, int]]:
    boxes = list(boxes)
    changed = True
    while changed:
        changed = False
        used = [False] * len(boxes)
        nxt: list[tuple[int, int, int, int, int]] = []
        for i, box in enumerate(boxes):
            if used[i]:
                continue
            area, x0, y0, x1, y1 = box
            for j in range(i + 1, len(boxes)):
                if used[j]:
                    continue
                other = boxes[j]
                close = other[1] <= x1 + gap and other[3] >= x0 - gap and other[2] <= y1 + gap and other[4] >= y0 - gap
                if close and (other[0] < 9000 or area < 9000):
                    x0, y0 = min(x0, other[1]), min(y0, other[2])
                    x1, y1 = max(x1, other[3]), max(y1, other[4])
                    area += other[0]
                    used[j] = True
                    changed = True
            nxt.append((area, x0, y0, x1, y1))
        boxes = nxt
    boxes.sort(key=lambda box: (box[4] // 70, box[1]))
    return boxes


def flood(near: np.ndarray) -> np.ndarray:
    h, w = near.shape
    exterior = np.zeros((h, w), dtype=bool)
    q: deque[tuple[int, int]] = deque()
    for x in range(w):
        for y in (0, h - 1):
            if near[y, x] and not exterior[y, x]:
                exterior[y, x] = True
                q.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if near[y, x] and not exterior[y, x]:
                exterior[y, x] = True
                q.append((y, x))
    while q:
        y, x = q.popleft()
        for ny, nx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
            if 0 <= ny < h and 0 <= nx < w and near[ny, nx] and not exterior[ny, nx]:
                exterior[ny, nx] = True
                q.append((ny, nx))
    return exterior


def dilate(mask: np.ndarray, radius: int) -> np.ndarray:
    out = mask.copy()
    h, w = mask.shape
    for dy in range(-radius, radius + 1):
        for dx in range(-radius, radius + 1):
            if dx == 0 and dy == 0:
                continue
            y0, y1 = max(0, dy), h + min(0, dy)
            x0, x1 = max(0, dx), w + min(0, dx)
            sy0, sy1 = max(0, -dy), h - max(0, dy)
            sx0, sx1 = max(0, -dx), w - max(0, dx)
            out[y0:y1, x0:x1] |= mask[sy0:sy1, sx0:sx1]
    return out


def keyed(im: Image.Image, kind: str) -> Image.Image:
    rgb = np.asarray(im.convert("RGB")).astype(np.float32)
    white = rgb.min(axis=2)
    # branco de JPEG: canal mais escuro ainda alto
    near = white > 236
    exterior = flood(near)
    holes = near & ~exterior
    hole = np.zeros(near.shape, dtype=bool)
    seen = np.zeros(near.shape, dtype=bool)
    ys, xs = np.where(holes)
    for y, x in zip(ys.tolist(), xs.tolist()):
        if seen[y, x]:
            continue
        blob: list[tuple[int, int]] = []
        qq = deque([(y, x)])
        seen[y, x] = True
        while qq:
            cy, cx = qq.popleft()
            blob.append((cy, cx))
            for ny, nx in ((cy - 1, cx), (cy + 1, cx), (cy, cx - 1), (cy, cx + 1)):
                if 0 <= ny < holes.shape[0] and 0 <= nx < holes.shape[1] and holes[ny, nx] and not seen[ny, nx]:
                    seen[ny, nx] = True
                    qq.append((ny, nx))
        if len(blob) >= 80:
            for cy, cx in blob:
                hole[cy, cx] = True
    clear = exterior | hole
    # cobertura: 0 no branco puro, 1 quando o pixel já é tinta
    cover = np.clip((248 - white) / 36, 0, 1)
    cover[clear] = 0
    if kind == "ink":
        # carimbo: só a tinta (vermelho). papel claro some
        red = (rgb[:, :, 0] > rgb[:, :, 1] + 18) & (rgb[:, :, 0] > rgb[:, :, 2] + 12)
        cover = np.where(red, np.clip((rgb[:, :, 0] - rgb[:, :, 1]) / 80, 0.35, 1), 0)
        cover[exterior] = 0
    if kind == "frame":
        # moldura vazia: o miolo branco também sai, mesmo se o flood não fechar
        cover = np.where(white > 232, 0, cover)
    if kind == "glass":
        # vidro claro fica semitransparente; tinta e metal continuam opacos
        lum = rgb.mean(axis=2)
        sat = rgb.max(axis=2) - rgb.min(axis=2)
        glass = (lum > 170) & (sat < 48) & ~clear
        cover = np.where(glass, np.clip((255 - lum) / 90, 0.18, 0.55), cover)
        cover[clear] = 0
    # tira o branco misturado: a borda fica da cor da tinta, não um cinza escuro
    fg = rgb.copy()
    partial = (cover > 0.02) & (cover < 0.98)
    inv = 1 - cover
    for c in range(3):
        fg[:, :, c] = np.where(partial, (fg[:, :, c] - 255 * inv) / np.maximum(cover, 0.08), fg[:, :, c])
    fg = np.clip(fg, 0, 255)
    # pixels quase brancos só na franja encostada no fundo (não come papel claro)
    zone = dilate(clear, 4)
    dirty = partial & (fg.min(axis=2) > 210) & zone
    cover = np.where(dirty, 0, cover)
    alpha = np.clip(cover * 255, 0, 255).astype(np.uint8)
    out = np.dstack([fg.astype(np.uint8), alpha])
    return Image.fromarray(out, "RGBA")


def tight(im: Image.Image) -> Image.Image:
    alpha = np.asarray(im)[:, :, 3]
    ys, xs = np.where(alpha > 8)
    if len(xs) == 0:
        return im
    return im.crop((int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1))


def fit(im: Image.Image, tw: int, th: int) -> Image.Image:
    im = tight(im)
    if tw <= 0 and th <= 0:
        return im
    if tw <= 0:
        tw = max(1, round(im.width * (th / im.height)))
    if th <= 0:
        th = max(1, round(im.height * (tw / im.width)))
    scale = min(tw / im.width, th / im.height)
    nw = max(1, round(im.width * scale))
    nh = max(1, round(im.height * scale))
    resized = im.resize((nw, nh), Image.Resampling.LANCZOS)
    if tw == resized.width and th == resized.height and (im.width != tw or im.height != th):
        return resized
    canvas = Image.new("RGBA", (tw, th), (0, 0, 0, 0))
    canvas.paste(resized, ((tw - nw) // 2, (th - nh) // 2), resized)
    return canvas


def split(path: str, kind: str, count: int) -> list[Image.Image]:
    src = Image.open(path).convert("RGB")
    rgb = np.asarray(src)
    white = rgb.min(axis=2)
    mask = white < 236
    boxes = components(mask, max(400, int(mask.size * 0.002)))
    pieces = []
    for index, (_, x0, y0, x1, y1) in enumerate(boxes):
        pad = 6
        crop = src.crop((max(0, x0 - pad), max(0, y0 - pad), min(src.width, x1 + pad + 1), min(src.height, y1 + pad + 1)))
        piece_kind = "frame" if kind == "mixed" and index == count - 1 else ("solid" if kind == "mixed" else kind)
        pieces.append(keyed(crop, piece_kind))
    return pieces


def cover(path: str, tw: int, th: int) -> Image.Image:
    im = Image.open(path).convert("RGB")
    scale = max(tw / im.width, th / im.height)
    nw, nh = round(im.width * scale), round(im.height * scale)
    im = im.resize((nw, nh), Image.Resampling.LANCZOS)
    left = (nw - tw) // 2
    top = (nh - th) // 2
    return im.crop((left, top, left + tw, top + th))


def run_sheets(folder: str, sheets: list[tuple[str, list[tuple[str, int, int]], str]], dest: str) -> None:
    os.makedirs(dest, exist_ok=True)
    for src, names, kind in sheets:
        pieces = split(os.path.join(folder, src), kind, len(names))
        print(src, "blobs", len(pieces), "esperados", len(names))
        if len(pieces) != len(names):
            raise SystemExit(f"{src}: {len(pieces)} blobs, esperava {len(names)}")
        for piece, (name, tw, th) in zip(pieces, names):
            img = fit(piece, tw, th)
            img.save(os.path.join(dest, name))
            print(" ", name, img.size)


def main() -> None:
    os.makedirs(OUT, exist_ok=True)
    for name in BGS:
        cover(os.path.join(RAW, name), 1920, 1080).save(os.path.join(OUT, name.replace(".jpg", ".png")))
        print("bg", name)
    run_sheets(RAW, SHEETS, OUT)
    cover(os.path.join(ENT, "bg_central_entrega.jpg"), 1920, 1080).save(os.path.join(ENT_OUT, "bg_central_entrega.png"))
    run_sheets(ENT, ENTREGA, ENT_OUT)
    icon = os.path.join(ENT_OUT, "app_central_entrega.png")
    if os.path.exists(icon):
        Image.open(icon).save(os.path.join(PHONE, "app_central_entrega.png"))
    for name in ("hs_cama.png", "hs_fogao.png", "hs_caixa.png", "hs_cama_full.png", "hs_fogao_full.png", "hs_caixa_full.png"):
        Image.open(os.path.join(HS, name)).save(os.path.join(HUB, name))
        print("hs", name)
    os.makedirs(PECA_OUT, exist_ok=True)
    for name in sorted(os.listdir(PECAS)):
        if not name.endswith(".png"):
            continue
        img = fit(keyed(Image.open(os.path.join(PECAS, name)), "solid"), 512, 512)
        img.save(os.path.join(PECA_OUT, f"peca_{name}"))
        print("peca", name, img.size)


if __name__ == "__main__":
    main()
