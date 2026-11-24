"""
AURA STUDIOS - Product artwork
Generates clean, flat product images (garment only, no people) as SVG.
Nothing is downloaded: images load instantly and never break.
"""

import re

KINDS = ("hoodie", "sweatshirt", "tee", "shirt", "pants")

CATEGORY_KIND = {
    "hoodies": "hoodie",
    "sweatshirts": "sweatshirt",
    "t-shirts": "tee",
    "shirts": "shirt",
    "pants": "pants",
}

# Colour names usable in the admin form
PALETTE = {
    "Charcoal": "3a3b3e",
    "Black": "1b1b1d",
    "Olive": "6b6f4e",
    "Ecru": "e4dccb",
    "Moss": "7d8466",
    "Chalk": "f1efe9",
    "Mineral": "8d9499",
    "Sand": "c9b99a",
    "Navy": "26344d",
}

BACKGROUND = "#efe6d8"
GROUND = {"hoodie": 418, "sweatshirt": 394, "tee": 408, "shirt": 420, "pants": 452}


def kind_for_category(category):
    return CATEGORY_KIND.get((category or "").strip().lower(), "tee")


def art_images(kind, color_hex, style=""):
    """Return [front, back] image URLs for a garment."""
    q = f"?s={style}" if style else ""
    q2 = f"?v=back&s={style}" if style else "?v=back"
    base = f"/img/{kind}/{color_hex}.svg"
    return [base + q, base + q2]


# ---------- colour helpers ----------
def _rgb(h):
    return int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)


def _hex(r, g, b):
    return "#%02x%02x%02x" % (max(0, min(255, int(r))), max(0, min(255, int(g))), max(0, min(255, int(b))))


def shade(h, f):
    """f<0 darkens, f>0 lightens (-1..1)."""
    r, g, b = _rgb(h)
    if f < 0:
        return _hex(r * (1 + f), g * (1 + f), b * (1 + f))
    return _hex(r + (255 - r) * f, g + (255 - g) * f, b + (255 - b) * f)


def is_light(h):
    r, g, b = _rgb(h)
    return (0.299 * r + 0.587 * g + 0.114 * b) > 170


def mirror(points):
    return [(400 - x, y) for x, y in points]


def poly(points, fill, stroke, sw=2):
    pts = " ".join(f"{x},{y}" for x, y in points)
    return f'<polygon points="{pts}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}" stroke-linejoin="round"/>'


# ---------- garments ----------
def _hoodie(c, d, l, back, style):
    out = []
    sleeve = [(124, 140), (64, 168), (40, 362), (92, 370), (124, 262)]
    out.append(poly(sleeve, c, d))
    out.append(poly(mirror(sleeve), c, d))
    out.append(f'<rect x="38" y="352" width="56" height="22" rx="4" fill="{d}"/>')
    out.append(f'<rect x="306" y="352" width="56" height="22" rx="4" fill="{d}"/>')
    out.append(f'<rect x="120" y="128" width="160" height="268" rx="10" fill="{c}" stroke="{d}" stroke-width="2"/>')
    out.append(f'<rect x="120" y="378" width="160" height="26" rx="5" fill="{d}"/>')
    if back:
        out.append(f'<path d="M146 128 Q200 168 254 128 Q256 78 200 68 Q144 78 146 128 Z" fill="{c}" stroke="{d}" stroke-width="2"/>')
        out.append(f'<path d="M200 168 L200 378" stroke="{d}" stroke-width="2" opacity=".5"/>')
    else:
        out.append(f'<path d="M146 130 Q144 76 200 66 Q256 76 254 130 Z" fill="{d}" opacity=".55"/>')
        out.append(f'<path d="M150 128 Q200 176 250 128 Q246 92 200 84 Q154 92 150 128 Z" fill="{c}" stroke="{d}" stroke-width="2"/>')
        out.append(f'<path d="M166 124 Q200 150 234 124 Q226 100 200 96 Q174 100 166 124 Z" fill="{d}" opacity=".75"/>')
        if style == "zip":
            out.append(f'<path d="M200 150 L200 380" stroke="{l}" stroke-width="3"/>')
            out.append(f'<rect x="195" y="146" width="10" height="16" rx="2" fill="{l}"/>')
            out.append(f'<path d="M142 300 L142 350 M258 300 L258 350" stroke="{d}" stroke-width="3" stroke-linecap="round"/>')
        else:
            out.append(f'<path d="M148 296 L252 296 L270 366 L130 366 Z" fill="{c}" stroke="{d}" stroke-width="2"/>')
            out.append(f'<path d="M158 300 L146 360 M242 300 L254 360" stroke="{d}" stroke-width="2" opacity=".6"/>')
    return "".join(out)


def _sweatshirt(c, d, l, back, style):
    out = []
    sleeve = [(124, 140), (64, 168), (40, 350), (92, 358), (124, 250)]
    out.append(poly(sleeve, c, d))
    out.append(poly(mirror(sleeve), c, d))
    out.append(f'<rect x="38" y="340" width="56" height="22" rx="4" fill="{d}"/>')
    out.append(f'<rect x="306" y="340" width="56" height="22" rx="4" fill="{d}"/>')
    out.append(f'<rect x="120" y="128" width="160" height="244" rx="10" fill="{c}" stroke="{d}" stroke-width="2"/>')
    out.append(f'<rect x="120" y="354" width="160" height="26" rx="5" fill="{d}"/>')
    depth = 18 if back else 40
    out.append(f'<path d="M160 128 Q200 {128 + depth} 240 128" fill="none" stroke="{d}" stroke-width="12" stroke-linecap="round"/>')
    if back:
        out.append(f'<text x="200" y="190" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="20" letter-spacing="6" fill="{l}" opacity=".7">AURA</text>')
    else:
        out.append(f'<path d="M180 300 L220 300" stroke="{l}" stroke-width="3" stroke-linecap="round" opacity=".7"/>')
    return "".join(out)


def _tee(c, d, l, back, style):
    out = []
    sleeve = [(126, 138), (68, 158), (36, 236), (92, 256), (126, 212)]
    out.append(poly(sleeve, c, d))
    out.append(poly(mirror(sleeve), c, d))
    out.append(f'<rect x="124" y="130" width="152" height="264" rx="10" fill="{c}" stroke="{d}" stroke-width="2"/>')
    depth = 14 if back else 34
    out.append(f'<path d="M162 130 Q200 {130 + depth} 238 130" fill="none" stroke="{d}" stroke-width="11" stroke-linecap="round"/>')
    if back:
        out.append(f'<text x="200" y="196" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="20" letter-spacing="6" fill="{l}" opacity=".75">AURA</text>')
    else:
        out.append(f'<text x="200" y="204" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="13" letter-spacing="4" fill="{l}" opacity=".75">AURA STUDIOS</text>')
    return "".join(out)


def _shirt(c, d, l, back, style):
    out = []
    sleeve = [(126, 138), (68, 160), (40, 262), (96, 280), (126, 224)]
    out.append(poly(sleeve, c, d))
    out.append(poly(mirror(sleeve), c, d))
    out.append(f'<rect x="124" y="130" width="152" height="276" rx="8" fill="{c}" stroke="{d}" stroke-width="2"/>')
    if back:
        out.append(f'<path d="M124 176 Q200 190 276 176" fill="none" stroke="{d}" stroke-width="2" opacity=".6"/>')
        out.append(f'<path d="M168 130 Q200 146 232 130 L232 120 Q200 134 168 120 Z" fill="{c}" stroke="{d}" stroke-width="2"/>')
        out.append(f'<path d="M200 190 L200 214 M192 190 L192 214 M208 190 L208 214" stroke="{d}" stroke-width="2" opacity=".5"/>')
    else:
        out.append(f'<path d="M200 132 L200 404" stroke="{d}" stroke-width="2"/>')
        for y in range(168, 400, 40):
            out.append(f'<circle cx="200" cy="{y}" r="3.5" fill="{l}" stroke="{d}" stroke-width="1"/>')
        out.append(f'<polygon points="166,124 200,168 200,128 178,112" fill="{c}" stroke="{d}" stroke-width="2" stroke-linejoin="round"/>')
        out.append(f'<polygon points="234,124 200,168 200,128 222,112" fill="{c}" stroke="{d}" stroke-width="2" stroke-linejoin="round"/>')
        if style == "utility":
            out.append(f'<rect x="136" y="200" width="46" height="46" rx="3" fill="{c}" stroke="{d}" stroke-width="2"/>')
            out.append(f'<rect x="218" y="200" width="46" height="46" rx="3" fill="{c}" stroke="{d}" stroke-width="2"/>')
            out.append(f'<path d="M136 214 L182 214 M218 214 L264 214" stroke="{d}" stroke-width="2"/>')
    return "".join(out)


def _pants(c, d, l, back, style):
    out = []
    left = [(138, 70), (200, 70), (200, 170), (192, 438), (116, 438), (128, 170)]
    if style == "balloon":
        left = [(134, 70), (200, 70), (200, 170), (186, 438), (110, 438), (112, 210)]
    out.append(poly(left, c, d))
    out.append(poly(mirror(left), c, d))
    out.append(f'<rect x="136" y="56" width="128" height="26" rx="4" fill="{d}"/>')
    if style == "cargo":
        out.append(f'<rect x="124" y="250" width="40" height="52" rx="3" fill="{c}" stroke="{d}" stroke-width="2"/>')
        out.append(f'<rect x="236" y="250" width="40" height="52" rx="3" fill="{c}" stroke="{d}" stroke-width="2"/>')
        out.append(f'<rect x="120" y="420" width="72" height="10" rx="3" fill="{d}"/>')
        out.append(f'<rect x="208" y="420" width="72" height="10" rx="3" fill="{d}"/>')
    if back:
        out.append(f'<rect x="146" y="102" width="34" height="30" rx="3" fill="none" stroke="{d}" stroke-width="2"/>')
        out.append(f'<rect x="220" y="102" width="34" height="30" rx="3" fill="none" stroke="{d}" stroke-width="2"/>')
        out.append(f'<path d="M200 82 L200 190" stroke="{d}" stroke-width="2" opacity=".6"/>')
    else:
        out.append(f'<path d="M200 82 L200 150 Q196 160 188 158" fill="none" stroke="{d}" stroke-width="2"/>')
        out.append(f'<path d="M164 84 Q150 110 148 130 M236 84 Q250 110 252 130" fill="none" stroke="{d}" stroke-width="2" opacity=".7"/>')
        out.append(f'<path d="M190 82 L190 118 M210 82 L210 118" stroke="{l}" stroke-width="3" stroke-linecap="round" opacity=".8"/>')
        if style in ("balloon",):
            out.append(f'<path d="M168 90 L164 260 M232 90 L236 260" stroke="{d}" stroke-width="2" opacity=".35"/>')
    return "".join(out)


_DRAW = {
    "hoodie": _hoodie,
    "sweatshirt": _sweatshirt,
    "tee": _tee,
    "shirt": _shirt,
    "pants": _pants,
}


def render_svg(kind, color_hex, view="front", style="", transparent=False):
    if kind not in _DRAW:
        kind = "tee"
    if not re.fullmatch(r"[0-9a-fA-F]{6}", color_hex or ""):
        color_hex = "3a3b3e"
    color_hex = color_hex.lower()
    c = "#" + color_hex
    d = shade(color_hex, -0.28 if not is_light(color_hex) else -0.2)
    l = shade(color_hex, 0.55) if not is_light(color_hex) else shade(color_hex, -0.35)
    body = _DRAW[kind](c, d, l, view == "back", re.sub(r"[^a-z]", "", style or ""))
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 500" role="img" '
        f'aria-label="{kind} product image">'
        + ("" if transparent else f'<rect width="400" height="500" fill="{BACKGROUND}"/>') +
        f'<ellipse cx="200" cy="{GROUND.get(kind, 440)}" rx="110" ry="8" fill="#000" opacity=".08"/>'
        f"{body}</svg>"
    )
