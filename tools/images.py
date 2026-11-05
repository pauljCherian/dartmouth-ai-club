#!/usr/bin/env python3
"""Image pipeline for the Dartmouth AI Club site. Needs Python 3.10+, Pillow (with AVIF/WebP) and numpy;
pillow-heif for iPhone .heic originals (optional: a JPEG export works without it).

  python3 tools/images.py hero <src.jpg> public/img/hero [--compare review.png]
  python3 tools/images.py portrait <src> <id> public/img/people --crop x,y,w,h
  python3 tools/images.py manifest public/img
  python3 tools/images.py sheet public/img/people <duo|color> out.png id1 id2 ...
  python3 tools/images.py og public/img/hero assets-src/brand/og-logo.png public/og.jpg
  python3 tools/images.py original ~/Downloads/IMG_1234.HEIC assets-src/people/first-last.jpg
                                       a clean copy of an original for assets-src/: upright, sRGB, JPEG
                                       quality 95, and no metadata at all (no location, no camera data).
                                       Won't replace an existing file without --force (the group photo:
                                       ... assets-src/hero/hero.jpg --force)
  python3 tools/images.py all          rebuild every image listed in content/photos.json, the link-preview
                                       image (public/og.jpg) and the manifest

Every output is converted to sRGB and saved without any metadata (no EXIF, no GPS, no camera data).
Never upscales: if a crop is smaller than a target size, the largest available size is written instead.
"""
from __future__ import annotations

import io
import json
import math
import re
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageCms, ImageDraw, ImageFilter, ImageOps

try:  # iPhone originals (.heic), if pillow-heif is installed: pip install pillow-heif. Otherwise export a JPEG.
    import pillow_heif
    pillow_heif.register_heif_opener()
    HEIF = True
except ImportError:
    HEIF = False

INK = np.array([0x16, 0x16, 0x16], dtype=np.float64) / 255.0
PAPER = np.array([0xF4, 0xF4, 0xF1], dtype=np.float64) / 255.0
PAPER_RGB = (0xF4, 0xF4, 0xF1)
HERO_WIDTHS = [640, 960, 1280, 1600, 2048, 2560, 3200]
PORTRAIT_WIDTHS = [240, 480, 960]
FORMATS = (("avif", "AVIF", {"quality": 55, "speed": 6}),
           ("webp", "WEBP", {"quality": 82, "method": 6}),
           ("jpg", "JPEG", {"quality": 84, "progressive": True, "optimize": True, "subsampling": "4:2:0"}))


# ---------- loading ----------
def load_srgb(path: str) -> Image.Image:
    """Open, apply EXIF orientation, convert to sRGB from the embedded ICC profile (Display P3, a gray or a
    CMYK profile) in the image's own mode, and flatten any transparency onto paper (never pure white)."""
    if Path(path).suffix.lower() in (".heic", ".heif") and not HEIF:
        sys.exit(f"{path}: HEIC needs pillow-heif (pip install pillow-heif), or export the photo as a JPEG")
    im = Image.open(path)
    try:
        im.seek(0)  # MPO / multi-frame: primary image only
    except EOFError:
        pass
    icc = im.info.get("icc_profile")
    im = ImageOps.exif_transpose(im)
    # 16-bit grayscale: scale to 8 bits. convert() would clip everything above 255 to white.
    if im.mode in ("I;16", "I;16L", "I;16B", "I;16N", "I"):
        a = np.asarray(im).astype(np.float64)
        scale = 257.0 if (im.mode != "I" or a.max() > 255) else 1.0
        im = Image.fromarray(np.clip(np.round(a / scale), 0, 255).astype(np.uint8), "L")
    if im.mode == "1":
        im = im.convert("L")
    # Transparency in any form (alpha channel, palette, single-colour key) becomes a separate alpha mask.
    alpha = None
    if im.mode == "P" or (im.mode in ("RGB", "L") and "transparency" in im.info):
        im = im.convert("LA" if im.mode == "L" else "RGBA")
    if im.mode in ("RGBA", "LA", "PA", "La", "RGBa"):
        alpha = im.getchannel("A")
        im = im.convert("L" if im.mode in ("LA", "La") else "RGB")
    if icc and im.mode in ("RGB", "L", "CMYK"):
        try:
            src = ImageCms.ImageCmsProfile(io.BytesIO(icc))
            im = ImageCms.profileToProfile(im, src, ImageCms.createProfile("sRGB"),
                                           renderingIntent=ImageCms.Intent.PERCEPTUAL, outputMode="RGB")
        except ImageCms.PyCMSError as e:
            print(f"warning: {path}: colour profile not applied ({e}); colours may be off", file=sys.stderr)
    im = im.convert("RGB")
    if alpha is not None:
        bg = Image.new("RGB", im.size, PAPER_RGB)
        bg.paste(im, mask=alpha)
        im = bg
    clean = Image.new("RGB", im.size)
    clean.paste(im)
    return clean  # a fresh image: carries no metadata


def to_np(im: Image.Image) -> np.ndarray:
    return np.asarray(im, dtype=np.float64) / 255.0


def to_im(a: np.ndarray) -> Image.Image:
    return Image.fromarray(np.clip(np.round(a * 255.0), 0, 255).astype(np.uint8), "RGB")


def luma(a: np.ndarray) -> np.ndarray:
    return a[..., 0] * 0.2126 + a[..., 1] * 0.7152 + a[..., 2] * 0.0722


# ---------- tone and colour ----------
def neutralise(a: np.ndarray, region: np.ndarray, strength: float) -> np.ndarray:
    """Move the average colour of `region` (neutral surfaces) toward gray by `strength` (0..1)."""
    m = region.reshape(-1, 3).mean(axis=0)
    gains = (m.mean() / m) ** strength
    return np.clip(a * gains, 0, 1)


def lift_shadows(a: np.ndarray, k: float) -> np.ndarray:
    """f(x) = x + k*x*(1-x)^2: black point and white point stay put; the low mids open up a little."""
    return np.clip(a + k * a * (1 - a) ** 2, 0, 1)


def levels(l: np.ndarray, lo_pct=0.5, hi_pct=99.5) -> np.ndarray:
    lo, hi = np.percentile(l, [lo_pct, hi_pct])
    return np.clip((l - lo) / max(hi - lo, 1e-6), 0, 1)


def face_gamma(l: np.ndarray, target=0.56) -> float:
    """Gamma that brings the face area (centre of a head-and-shoulders crop) to `target` brightness."""
    h, w = l.shape
    face = l[int(h * 0.22):int(h * 0.62), int(w * 0.30):int(w * 0.70)]
    m = float(np.clip(face.mean(), 0.05, 0.95))
    return float(np.clip(math.log(target) / math.log(m), 0.6, 1.6))


def s_curve(l: np.ndarray, amount=0.22) -> np.ndarray:
    smooth = l * l * (3 - 2 * l)
    return l * (1 - amount) + smooth * amount


def duotone(a: np.ndarray) -> np.ndarray:
    """Ink-and-paper monochrome: 0 maps to ink #161616, 1 to paper #F4F4F1. No pure black or white."""
    l = levels(luma(a))
    l = l ** face_gamma(l)
    l = s_curve(l)
    return INK + (PAPER - INK) * l[..., None]


def balanced_colour(a: np.ndarray) -> np.ndarray:
    a = neutralise(a, a, 0.5)
    l = luma(a)
    ln = levels(l)
    g = face_gamma(ln)
    target = np.clip(ln ** g, 0, 1)
    ratio = np.where(l > 1e-4, target / np.maximum(l, 1e-4), 1.0)
    a = np.clip(a * ratio[..., None], 0, 1)
    gray = luma(a)[..., None]
    return np.clip(gray + (a - gray) * 0.85, 0, 1)


# ---------- saving ----------
def save_all(im: Image.Image, stem: Path) -> dict:
    out = {"w": im.width, "h": im.height}
    for ext, fmt, kw in FORMATS:
        p = stem.with_suffix(f".{ext}")
        im.save(p, fmt, **kw)
        out[ext] = p
    return out


def resized(im: Image.Image, w: int) -> Image.Image:
    if w >= im.width:
        return im
    h = round(im.height * w / im.width)
    r = im.resize((w, h), Image.LANCZOS)
    return r.filter(ImageFilter.UnsharpMask(radius=0.8, percent=40, threshold=2))


def widths_for(src_w: int, wanted: list[int]) -> list[int]:
    ws = [w for w in wanted if w <= src_w]
    if src_w < wanted[-1] and src_w not in ws:
        ws.append(src_w)
    return sorted(set(ws)) or [src_w]


# ---------- commands ----------
def cmd_hero(src: str, outdir: str, compare: str | None = None) -> None:
    out = Path(outdir)
    out.mkdir(parents=True, exist_ok=True)
    im = load_srgb(src)  # load first: a bad source must not delete the current images
    a = to_np(im)
    h = a.shape[0]
    top = a[: int(h * 0.15)]
    lt = luma(top)
    walls = top[(lt > 0.45) & (lt < 0.92)]
    a2 = neutralise(a, walls if walls.size else top, 0.55)  # the room light is warm: take about half of it out
    a2 = lift_shadows(a2, 0.15)
    fixed = to_im(a2)
    mono = to_im(duotone(a2))
    own = re.compile(r"^hero-(mono-)?\d+\.(avif|webp|jpg)$")
    for old in out.iterdir():
        if own.match(old.name):
            old.unlink()
    for w in widths_for(fixed.width, HERO_WIDTHS):
        save_all(resized(fixed, w), out / f"hero-{w}")
        save_all(resized(mono, w), out / f"hero-mono-{w}")
    print(f"hero: {im.width}x{im.height} -> {widths_for(fixed.width, HERO_WIDTHS)}")
    if compare:
        before = im.copy()
        bw = 900
        b = before.resize((bw, round(before.height * bw / before.width)), Image.LANCZOS)
        f = fixed.resize(b.size, Image.LANCZOS)
        sheet = Image.new("RGB", (bw * 2 + 30, b.height + 40), (244, 244, 241))
        sheet.paste(b, (0, 40))
        sheet.paste(f, (bw + 30, 40))
        d = ImageDraw.Draw(sheet)
        d.text((4, 12), "As sent", fill=(22, 22, 22))
        d.text((bw + 34, 12), "Corrected: warm cast reduced by about half, shadows opened slightly", fill=(22, 22, 22))
        sheet.save(compare, optimize=True)


def cmd_portrait(src: str, pid: str, outdir: str, crop: str, frac: bool = False) -> None:
    out = Path(outdir)
    out.mkdir(parents=True, exist_ok=True)
    im = load_srgb(src)
    x, y, w, h = [float(v) for v in crop.split(",")]
    if frac:
        x, y, w, h = x * im.width, y * im.height, w * im.width, h * im.height
    x, y, w, h = round(x), round(y), round(w), round(h)
    if x < 0 or y < 0 or x + w > im.width or y + h > im.height:
        sys.exit(f"{pid}: crop {x},{y},{w},{h} falls outside the {im.width}x{im.height} image")
    if abs(w / h - 0.8) > 0.01:
        sys.exit(f"{pid}: crop must be 4:5 (got {w}x{h})")
    c = im.crop((x, y, x + w, y + h))
    a = to_np(c)
    variants = {"duo": to_im(duotone(a)), "color": to_im(balanced_colour(a))}
    # Remove this id's old files only (exact id: "yann-lecun" must not delete "yann-lecun-visit-...").
    own = re.compile(rf"^{re.escape(pid)}-(duo|color)-\d+\.(avif|webp|jpg)$")
    for old in out.iterdir():
        if own.match(old.name):
            old.unlink()
    for tname, timg in variants.items():
        for tw in widths_for(timg.width, PORTRAIT_WIDTHS):
            save_all(resized(timg, tw), out / f"{pid}-{tname}-{tw}")
    note = " (smaller than 480 px: send a larger photo)" if w < 480 else ""
    print(f"{pid}: crop {w}x{h} from {im.width}x{im.height}{note}")


def cmd_original(src: str, dest: str, force: bool = False) -> None:
    if Path(dest).exists() and not force:
        sys.exit(f"{dest} already exists: add --force to replace it (check it is the photo you mean to replace)")
    im = load_srgb(src)
    Path(dest).parent.mkdir(parents=True, exist_ok=True)
    im.save(dest, "JPEG", quality=95, subsampling="4:4:4", optimize=True)  # nothing copied over: no EXIF, no GPS
    print(f"original: {dest} {im.width}x{im.height}, no metadata")


def cmd_og(herodir: str, logo_png: str, out: str) -> None:
    """Link-preview image, 1200x630: the whole group photo full-bleed on the left (4:3, so nothing is cropped;
    a wider crop would cut the back row), the two-line lockup on paper beside it, on the photo's bottom
    margin, like the settled hero on the site. The lockup is a PNG rendered from src/svg/logo-display.svg
    (render it again if the logo changes)."""
    heroes = sorted((p for p in Path(herodir).glob("hero-*.jpg") if re.match(r"^hero-\d+\.jpg$", p.name)),
                    key=lambda p: int(re.findall(r"\d+", p.name)[0]))
    if not heroes:
        sys.exit(f"og: no hero-<width>.jpg in {herodir} (run the hero command first)")
    photo = load_srgb(str(heroes[-1]))
    W, H, PW, M = 1200, 630, 840, 44
    # Cover the 840x630 box; anything cut comes off the top (the ceiling), never the sides or the bottom.
    s = max(PW / photo.width, H / photo.height)
    r = photo.resize((round(photo.width * s), round(photo.height * s)), Image.LANCZOS)
    left = (r.width - PW) // 2
    r = r.crop((left, r.height - H, left + PW, r.height))
    canvas = Image.new("RGB", (W, H), PAPER_RGB)
    canvas.paste(r, (0, 0))
    logo = Image.open(logo_png).convert("RGBA")
    lw = W - PW - 2 * M
    logo = logo.resize((lw, round(logo.height * lw / logo.width)), Image.LANCZOS)
    canvas.paste(logo, (PW + M, H - M - logo.height), logo)
    canvas.save(out, "JPEG", quality=88, optimize=True, progressive=True)  # no EXIF: nothing is copied over
    print(f"og: {out} from {heroes[-1].name}")


def cmd_manifest(imgdir: str) -> None:
    root = Path(imgdir)
    groups: dict[str, list] = {}
    pat = re.compile(r"^(?P<key>.+)-(?P<w>\d+)\.(?P<ext>avif|webp|jpg)$")
    for sub in ("hero", "people"):
        for p in sorted((root / sub).glob("*")):
            m = pat.match(p.name)
            if not m:
                continue
            key = f"{sub}/{m['key']}"
            w = int(m["w"])
            entry = next((v for v in groups.setdefault(key, []) if v["w"] == w), None)
            if entry is None:
                with Image.open(p) as probe:
                    entry = {"w": probe.width, "h": probe.height}
                groups[key].append(entry)
            entry[m["ext"]] = f"img/{sub}/{p.name}"
    manifest = {k: {"variants": sorted(v, key=lambda e: e["w"])} for k, v in sorted(groups.items())}
    (root / "manifest.json").write_text(json.dumps(manifest, indent=1) + "\n")
    print(f"manifest: {len(manifest)} images")


def cmd_sheet(imgdir: str, treatment: str, outpng: str, ids: list[str]) -> None:
    root = Path(imgdir)
    tiles = []
    for pid in ids:
        cands = sorted(root.glob(f"{pid}-{treatment}-*.jpg"), key=lambda p: int(re.findall(r"-(\d+)\.jpg$", p.name)[0]))
        if not cands:
            tiles.append((pid, None))
            continue
        tiles.append((pid, Image.open(cands[-1]).convert("RGB").resize((240, 300), Image.LANCZOS)))
    sheet = Image.new("RGB", (len(tiles) * 252 + 12, 340), (244, 244, 241))
    d = ImageDraw.Draw(sheet)
    for i, (pid, t) in enumerate(tiles):
        x = 12 + i * 252
        if t:
            sheet.paste(t, (x, 12))
        else:
            d.rectangle([x, 12, x + 240, 312], fill=(230, 230, 226))
            d.text((x + 8, 290), "photo to come", fill=(102, 102, 98))
        d.text((x, 318), pid, fill=(22, 22, 22))
    sheet.save(outpng, optimize=True)


def cmd_all(root: str = ".") -> None:
    base = Path(root)
    cfg = json.loads((base / "content/photos.json").read_text())
    failed = []
    try:
        cmd_hero(str(base / cfg["hero"]["src"]), str(base / "public/img/hero"))
    except (Exception, SystemExit) as e:  # keep going: one bad file must not leave public/img half rebuilt
        failed.append(f"hero: {e}")
    for p in cfg["portraits"]:
        try:
            cmd_portrait(str(base / p["src"]), p["id"], str(base / "public/img/people"), p["crop"], frac=bool(p.get("frac")))
        except (Exception, SystemExit) as e:
            failed.append(f"{p['id']}: {e}")
    try:
        cmd_og(str(base / "public/img/hero"), str(base / "assets-src/brand/og-logo.png"), str(base / "public/og.jpg"))
    except (Exception, SystemExit) as e:
        failed.append(f"og.jpg: {e}")
    cmd_manifest(str(base / "public/img"))
    for pid, why in cfg.get("missing", {}).items():
        print(f"missing portrait {pid}: {why}")
    if failed:
        sys.exit("Not rebuilt (the previous files were kept):\n- " + "\n- ".join(failed))


def main(argv: list[str]) -> None:
    if len(argv) < 2:
        sys.exit(__doc__)
    cmd, args = argv[1], argv[2:]
    if cmd == "hero":
        compare = args[args.index("--compare") + 1] if "--compare" in args else None
        cmd_hero(args[0], args[1], compare)
    elif cmd == "portrait":
        cmd_portrait(args[0], args[1], args[2], args[args.index("--crop") + 1], frac="--frac" in args)
    elif cmd == "manifest":
        cmd_manifest(args[0])
    elif cmd == "og":
        cmd_og(args[0], args[1], args[2])
    elif cmd == "original":
        cmd_original(args[0], args[1], force="--force" in args)
    elif cmd == "sheet":
        cmd_sheet(args[0], args[1], args[2], args[3:])
    elif cmd == "all":
        cmd_all(args[0] if args else ".")
    else:
        sys.exit(__doc__)


if __name__ == "__main__":
    main(sys.argv)
