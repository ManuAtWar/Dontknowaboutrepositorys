"""Baut itch/kapital-itch.zip aus dem Ordner investment-simulator.

Aufruf (im Hauptordner des Repositorys):  python3 itch/build_zip.py
"""
import pathlib
import zipfile

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "investment-simulator"
OUT = ROOT / "itch" / "kapital-itch.zip"

html = (SRC / "index.html").read_text(encoding="utf-8")
html = html.replace("<title>Börsen-Simulator</title>", "<title>Kapital – Investieren lernen</title>", 1)

with zipfile.ZipFile(OUT, "w", zipfile.ZIP_DEFLATED) as z:
    z.writestr("index.html", html)
    for name in ("academy-1.js", "academy-2.js"):
        z.write(SRC / name, name)

print(f"Fertig: {OUT} ({OUT.stat().st_size // 1024} KB)")
