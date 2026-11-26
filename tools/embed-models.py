#!/usr/bin/env python3
"""Packt Zombie-Modelle und Animationen in models/zombie-data.js.

So funktioniert das Spiel weiterhin per Doppelklick auf index.html (ohne Webserver).

Lege die Dateien (.fbx oder .glb) in models/zombie/ und starte:
    python3 tools/embed-models.py

Die Zuordnung passiert über den Dateinamen, z. B. von Mixamo:
    "Zombie Walk.fbx"      -> walk      "Zombie Running.fbx"  -> run
    "Zombie Attack.fbx"    -> attack    "Zombie Dying.fbx"    -> death
    "Zombie Scream.fbx"    -> scream    "Zombie Idle.fbx"     -> idle
    "Zombie Stand Up.fbx"  -> rise      "Zombie Crawl.fbx"    -> crawl
Eine Datei ohne solches Stichwort ist die Figur selbst (character).
"""
import base64
import json
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "models" / "zombie"
OUT = pathlib.Path(sys.argv[2]) if len(sys.argv) > 2 else ROOT / "models" / "zombie-data.js"

# Reihenfolge ist wichtig: "stand up" vor "stand", "running" vor allem anderen
RULES = [
    ("rise", r"stand ?up|getting ?up|get ?up|rise|rising"),
    ("death", r"dying|death|die|dead"),
    ("attack", r"attack|punch|bit(e|ing)|swip|hit|grab"),
    ("scream", r"scream|roar|shout|yell"),
    ("crawl", r"crawl"),
    ("run", r"run|sprint"),
    ("walk", r"walk"),
    ("idle", r"idle|stand"),
]


def key_for(name: str) -> str:
    n = name.lower()
    for key, pattern in RULES:
        if re.search(pattern, n):
            return key
    return "character"


def main() -> None:
    if not SRC.is_dir():
        sys.exit(f"Ordner nicht gefunden: {SRC}")
    out = {}
    for f in sorted(SRC.iterdir()):
        ext = f.suffix.lower().lstrip(".")
        if ext not in ("fbx", "glb"):
            continue
        key = key_for(f.stem)
        if key in out:
            print(f"  übersprungen (schon vorhanden: {key}): {f.name}")
            continue
        out[key] = {"ext": ext, "data": base64.b64encode(f.read_bytes()).decode("ascii")}
        print(f"  {key:9s} <- {f.name} ({f.stat().st_size / 1e6:.1f} MB)")
    if not out:
        sys.exit("Keine .fbx- oder .glb-Dateien gefunden.")
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text("window.TW_MODELS = " + json.dumps(out) + ";\n", encoding="utf-8")
    print(f"Fertig: {OUT} ({OUT.stat().st_size / 1e6:.1f} MB)")


if __name__ == "__main__":
    main()
