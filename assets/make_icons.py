"""
Generate MaterialCheck icons:
  icon.png           1024x1024  iOS + Android (full bleed, OS rundet)
  adaptive-icon.png  1024x1024  Android adaptive foreground layer
  splash-icon.png     200x200   Splash center logo (transparent)
  favicon.png          48x48   Browser tab (mit abgerundeten Ecken)

Design: dark bg #0d1117, EG (weiss) + Blitz (#c8f135)
"""

from PIL import Image, ImageDraw
import os, math

OUT = os.path.dirname(os.path.abspath(__file__)) + "/images"
os.makedirs(OUT, exist_ok=True)

BG    = (13, 17, 23)
BOLT  = (200, 241, 53)
WHITE = (255, 255, 255)

# ─── Blitz ────────────────────────────────────────────────────────────────────
def draw_bolt(draw, cx, cy, size, color):
    s = size
    pts = [
        (cx + 0.12*s,  cy - 0.48*s),
        (cx + 0.42*s,  cy - 0.48*s),
        (cx + 0.04*s,  cy - 0.01*s),
        (cx + 0.32*s,  cy - 0.01*s),
        (cx - 0.12*s,  cy + 0.48*s),
        (cx - 0.42*s,  cy + 0.48*s),
        (cx - 0.04*s,  cy + 0.01*s),
        (cx - 0.32*s,  cy + 0.01*s),
    ]
    draw.polygon(pts, fill=color)

# ─── "EG" aus Rechtecken ──────────────────────────────────────────────────────
def draw_eg(draw, cx, cy, size, color):
    s  = size
    th = max(2, s * 0.09)   # Strichbreite
    lw = s * 0.26           # Buchstabenbreite
    lh = s * 0.54           # Buchstabenhöhe
    gap = s * 0.08          # Abstand E-G

    # ── E ──
    ex = cx - lw/2 - gap/2
    ey = cy
    def r(x0,y0,x1,y1): draw.rectangle([x0,y0,x1,y1], fill=color)
    # Vertikale Linie
    r(ex - lw/2,         ey - lh/2, ex - lw/2 + th,     ey + lh/2)
    # Oben
    r(ex - lw/2,         ey - lh/2, ex + lw/2,           ey - lh/2 + th)
    # Mitte (3/4 breit)
    r(ex - lw/2,         ey - th/2, ex + lw/2 * 0.72,    ey + th/2)
    # Unten
    r(ex - lw/2,         ey + lh/2 - th, ex + lw/2,      ey + lh/2)

    # ── G ──
    gx = cx + lw/2 + gap/2
    gy = cy
    ox, oy = gx - lw/2, gy - lh/2
    # Links
    r(ox,             oy,           ox + th,      oy + lh)
    # Oben
    r(ox,             oy,           ox + lw,      oy + th)
    # Unten
    r(ox,             oy + lh - th, ox + lw,      oy + lh)
    # Rechts (nur untere Hälfte)
    r(ox + lw - th,   oy + lh/2,    ox + lw,      oy + lh)
    # Innerer Steg (Mitte rechts)
    r(ox + lw * 0.42, oy + lh/2 - th/2, ox + lw, oy + lh/2 + th/2)

# ─── Abgerundetes Rechteck ────────────────────────────────────────────────────
def rounded_rect(draw, xy, r, fill):
    x0, y0, x1, y1 = xy
    draw.rectangle([x0+r, y0, x1-r, y1], fill=fill)
    draw.rectangle([x0, y0+r, x1, y1-r], fill=fill)
    for cx, cy in [(x0+r,y0+r),(x1-r,y0+r),(x0+r,y1-r),(x1-r,y1-r)]:
        draw.ellipse([cx-r,cy-r,cx+r,cy+r], fill=fill)

# ─── Icon erstellen ───────────────────────────────────────────────────────────
def make_icon(size, path, bg=BG, rounded=False, transparent_bg=False,
              safe_zone=1.0, bolt_only=False):
    img  = Image.new("RGBA", (size, size), (0,0,0,0))
    draw = ImageDraw.Draw(img)

    if not transparent_bg:
        if rounded:
            pad = int(size * 0.04)
            r   = int(size * 0.22)
            rounded_rect(draw, (pad, pad, size-pad, size-pad), r, bg)
        else:
            draw.rectangle([0, 0, size, size], fill=bg)

    cx = size // 2
    cy = size // 2

    # safe_zone: Inhalt nur in diesem %-Bereich (für Android adaptive icon)
    content_size = size * safe_zone

    if bolt_only:
        draw_bolt(draw, cx, cy, content_size * 0.55, BOLT)
    else:
        # EG links, Blitz rechts — leicht nach links verschoben
        bolt_cx = cx + content_size * 0.16
        bolt_cy = cy
        draw_bolt(draw, bolt_cx, bolt_cy, content_size * 0.36, BOLT)
        draw_eg(draw, cx - content_size * 0.12, cy, content_size * 0.44, WHITE)

    # RGBA -> RGB für finale Icons (außer splash)
    if not transparent_bg:
        final = Image.new("RGB", (size, size), bg)
        final.paste(img, mask=img.split()[3])
        final.save(path, "PNG")
    else:
        img.save(path, "PNG")

    print(f"  OK {path}  ({size}x{size})")

print("Generating icons...")

# iOS / Android Haupt-Icon: full bleed, kein Padding
make_icon(1024, f"{OUT}/icon.png", rounded=False, safe_zone=0.80)

# Android Adaptive Icon foreground: safe zone ~66%
make_icon(1024, f"{OUT}/adaptive-icon.png", rounded=False, safe_zone=0.62)

# Splash: transparenter Hintergrund, nur Blitz
make_icon(200, f"{OUT}/splash-icon.png", transparent_bg=True, bolt_only=True, safe_zone=0.90)

# Favicon: abgerundete Ecken (Web)
make_icon(48, f"{OUT}/favicon.png", rounded=True, safe_zone=0.78)

print("Done.")
