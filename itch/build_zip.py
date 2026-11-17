"""Baut die beiden itch.io-Pakete aus dem Ordner investment-simulator:

  itch/kapital-demo.zip  kostenlose Demo (im Browser spielbar)
  itch/kapital-voll.zip  Vollversion (für Käufer)

Aufruf (im Hauptordner des Repositorys):  python3 itch/build_zip.py
Die Kauf-Seite der Vollversion steht unten in BUY_URL.
"""
import pathlib
import zipfile

BUY_URL = "https://manuatwar.itch.io/kapital"

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "investment-simulator"
OUT = ROOT / "itch"

base = (SRC / "index.html").read_text(encoding="utf-8")
assert "<title>Börsen-Simulator</title>" in base and '<script src="academy-1.js"></script>' in base


def build(name: str, title: str, demo: bool) -> None:
    html = base.replace("<title>Börsen-Simulator</title>", f"<title>{title}</title>", 1)
    if demo:
        flag = f'<script>window.KAPITAL_DEMO = true; window.KAPITAL_BUY_URL = "{BUY_URL}";</script>\n'
        html = html.replace('<script src="academy-1.js"></script>', flag + '<script src="academy-1.js"></script>', 1)
    target = OUT / name
    with zipfile.ZipFile(target, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("index.html", html)
        for f in ("academy-1.js", "academy-2.js"):
            z.write(SRC / f, f)
    print(f"Fertig: {target.name} ({target.stat().st_size // 1024} KB)")


build("kapital-demo.zip", "Kapital – Investieren lernen (Demo)", demo=True)
build("kapital-voll.zip", "Kapital – Investieren lernen", demo=False)
