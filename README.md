# TOTENWACHT

Ein Wellen-Survival-Shooter gegen Untote im Browser (Three.js) – inspiriert vom Spielprinzip klassischer Koop-Zombie-Modi:
Runden überleben, Punkte sammeln, die Karte freischalten, aufrüsten und zwischen den Wellen beim Händler einkaufen.

## Starten

Einfach `index.html` im Browser öffnen (Chrome/Edge/Firefox, Internetverbindung nötig, weil Three.js vom CDN geladen wird).

Alternativ über einen lokalen Server:

```bash
python3 -m http.server 8000
```

und dann `http://localhost:8000` öffnen.

## Steuerung

| Taste | Aktion |
|---|---|
| W A S D | Bewegen |
| Shift | Sprinten |
| Leertaste | Springen |
| Linke Maus | Schießen |
| Rechte Maus | Zielen (ADS) |
| R | Nachladen |
| E | Kaufen / Benutzen – **halten** an Fenstern zum Reparieren der Barrikade |
| V | Messer |
| G | Granate |
| 1 / 2 / Q / Mausrad | Waffe wechseln |
| N | In der Pause zwischen den Wellen sofort die nächste Welle starten |
| Esc | Pause |

## Spielprinzip

**Runden & Punkte**
- Unendliche Wellen, die immer größer und zäher werden. Treffer geben +10, Kills +60, Kopfschuss-Kills +100, Messer-Kills +130.
- Untote steigen vor den Fenstern aus dem Boden, reißen die Bretter ab und klettern hinein. Halte **E**, um Bretter wieder anzubringen (gibt Punkte).
- Jede 5. Welle erscheint **Der Schlächter** – ein Boss mit Sturmangriff und Bodenstampfer.

**Karte** – vier Bereiche, die per Tür freigekauft werden:
Bunker (Start) · Innenhof · Lagerhalle · Kapelle

**Kaufbare Dinge**
- **Wandwaffen** (Kreidezeichnungen): MP-K, Schrot 12, STG-R Sturmgewehr, Falke DMR. Nochmal kaufen = Munition zum halben Preis.
- **Zufallskiste** (950): zufällige Waffe, darunter Säge LMG, Donner-Werfer (Raketenwerfer) und die Wunderwaffe **Funkenstrahler** (Kettenblitz).
- **Perk-Automaten** (max. 4): Eisenhaut (doppelte LP), Schnellhand (schnelles Nachladen), Doppelfeuer (Feuerrate), Zweite Chance (Selbst-Wiederbelebung), Leichtfuß (endlos sprinten).
- **Verstärker** (5000): verbessert die aktuelle Waffe (mehr Schaden, größeres Magazin, neuer Name).

**Händler & Klassen**
- Nach jeder Welle gibt es 30 Sekunden Pause. Der **Händler** im Bunker verkauft dann Munition, Panzerweste, Granaten, Erste Hilfe und Waffen.
- Vor dem Spiel wählst du eine **Klasse** mit eigenen Boni und Händlerrabatt: Kommando, Scharfschütze, Unterstützer, Sanitäter, Sprengmeister, Berserker.
- Die **Panzerung** fängt 70 % des Schadens ab.
- **Zeitlupe**: Kopfschuss-Kills und Kill-Serien können eine kurze Zeitlupe auslösen.

**Gegnertypen**
| Gegner | Ab Welle | Besonderheit |
|---|---|---|
| Schlurfer | 1 | Wird mit der Zeit schneller (schlurfen → joggen → rennen) |
| Sprinter | 3 | Sehr schnell, wenig Leben |
| Spucker | 4 | Wirft Säure aus der Distanz, hinterlässt Pfützen |
| Bomber | 5 | Explodiert neben dir – oder wenn er stirbt (trifft auch andere Untote) |
| Koloss | 6 | Riesig und zäh; wird bei halber Lebensenergie **wütend** und rennt |
| Der Schlächter | 5, 10, 15 … | Boss |

**Power-ups** (zufällig von Untoten fallen gelassen)
Munitionskiste · Todesstoß (One-Hit-Kills) · Doppelte Punkte · Feuersturm (tötet alle) · Zimmermann (repariert alle Barrikaden)

## Technik

- Eine einzige Datei: `index.html` (HTML, CSS und JavaScript-Modul).
- 3D mit [Three.js](https://threejs.org) 0.170, alle Texturen und Sounds werden prozedural erzeugt – keine externen Assets.
- Realistische Materialien: Farbe, Relief (Normal-Map) und Rauheit/Metall werden beim Start per Code erzeugt (Ziegel, Beton mit nassen Pfützen, Kopfsteinpflaster, Holz, rostiges Metall, Haut, zerrissener Stoff).
- Grafikstufen im Menü (**Niedrig / Mittel / Hoch / Ultra**):
  - Mittel: Bloom (Leuchten), Farbkorrektur, Vignette, Filmkorn, chromatische Aberration
  - Hoch: zusätzlich weiche Schatten (Taschenlampe, Mond) und Umgebungsverschattung (GTAO)
  - Ultra: höhere Auflösung, schärfere Schatten, Schatten auch von Deckenlampen
- Atmosphäre: Hängelampen mit Lichtkegeln, schwebender Staub, Bodennebel, Sternenhimmel mit Mond, Spiegelungen auf Metall und Pfützen.
- Zombies mit Knie- und Ellbogengelenken, beweglichem Kiefer und leuchtenden Augen.
- **Echte animierte Zombie-Modelle (optional):** Figuren und Animationen (z. B. von Mixamo) in `models/zombie/` ablegen und mit `python3 tools/embed-models.py` verpacken – Anleitung in [`models/zombie/README.md`](models/zombie/README.md). Animationen für Gehen, Rennen, Angriff, Sterben, Schreien, Aufstehen werden automatisch erkannt; Kopfschüsse treffen den echten Kopf-Knochen. Ohne Modelle werden die eingebauten Zombies benutzt.
- Pfadfindung der Untoten über ein Flussfeld auf dem Kartenraster.
- Einstellungen und Rekord werden im `localStorage` des Browsers gespeichert.
