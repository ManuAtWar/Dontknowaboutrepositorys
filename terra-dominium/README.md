# TERRA DOMINIUM

Rundenbasiertes Weltstrategie-Spiel im Browser – läuft auf **PC und Handy** (Touch, Pinch-Zoom).

* **Echte Weltkarte** (Natural Earth 1:50 Mio.) mit 196 spielbaren Staaten, echten Landgrenzen und echten Küstenabständen.
* **Start von jedem Land aus** – von den USA bis Liechtenstein, mit Schwierigkeitsgrad nach realer Militärstärke.
* **Realistische Streitkräfte pro Land** (Stand ca. 2024/25): aktive Soldaten, Reservisten, Kampfpanzer, Schützen-/Transportpanzer,
  Rohr- und Raketenartillerie, Kampfflugzeuge, strategische Bomber, Kampfhubschrauber, Flugzeugträger, amphibische Schiffe,
  Zerstörer, Fregatten, Korvetten, U-Boote, Atomsprengköpfe, Militärbudget, Technologiestand und die wichtigsten Waffensysteme
  (z. B. Leopard 2A7V, F-35A, Type 055, K9 Thunder).

## Spielen

`index.html` im Browser öffnen – fertig (läuft offline, alle Daten sind eingebettet).

## Spielmechanik

| Element | Wirkung |
|---|---|
| **Invasion** | Du legst fest, wie viel Prozent von Heer, Luftwaffe und Marine du einsetzt. Kampf in bis zu 3 Phasen: Seeschlacht → Luftkampf → Bodenkampf. |
| **Angriffswege** | Landgrenze, Meerenge (≤ 60 km) oder Seeweg. Die Seereichweite hängt von deiner Flotte ab, Flugzeugträger erhöhen sie stark. |
| **Landekapazität** | Bei Seelandungen begrenzen amphibische Schiffe, Träger und Begleitschiffe, wie viele Truppen an Land kommen. |
| **Luftüberlegenheit** | Wer den Luftkampf gewinnt, bekommt bis zu +40 % im Bodenkampf. |
| **Luftschlag** | Zerstört Gerät, ohne einzumarschieren. Reichweite: Kampfjets ca. 1.100 km, mit Bombern oder Trägern weltweit. |
| **Technologie** | Multipliziert die Kampfkraft aller Einheiten (Qualität schlägt Masse). Modernisierung ist kaufbar. |
| **Gelände** | Gebirge, Dschungel und Winter geben Verteidigern Boni (Schweiz +60 %, Afghanistan +60 %, Russland +35 %). |
| **Kriegsfortschritt** | Jeder erfolgreiche Angriff erhöht ihn. Bei 100 % kapituliert das Land, und 20 % seines Geräts werden erbeutet. Ohne Druck sinkt er wieder. |
| **Atommächte** | Ab 60 % Fortschritt droht nukleare Eskalation, die die Offensive zurückwirft. |
| **Wirtschaft** | Einnahmen = Militärbudgets aller eigenen Länder. Rüstungsetat bis ×3, aber mehr Aufstände. |
| **Aufstände** | Besetzte Länder können rebellieren, besonders bei zu wenigen Soldaten oder im „Totalen Krieg“. |
| **Weltspannung** | Je mehr du eroberst, desto öfter greifen dich andere Mächte an. Die KI-Staaten führen auch untereinander Krieg. |

## Projektstruktur

```
data/military.txt        Streitkräfte-Datenbank (eine Zeile pro Land, leicht editierbar)
data/countries-50m.json  Weltkarte (world-atlas / Natural Earth, Public Domain)
src/                     Spielcode (game.js), Layout (template.html), Design (style.css)
vendor/                  d3 7.8.5 und topojson-client 3.1.0 (für den Offline-Betrieb)
build.mjs                Erzeugt index.html (+ dist/artifact.html mit CDN-Bibliotheken)
```

Neu bauen nach Änderungen an Daten oder Code: `node build.mjs`

## Datenquellen und Hinweis

Die Militärdaten sind Näherungswerte nach öffentlichen Quellen (IISS *The Military Balance*, SIPRI Military Expenditure Database,
Global Firepower, FAS Nuclear Notebook). Je nach Quelle und Zählweise (aktiv oder eingelagert) weichen einzelne Zahlen ab.
Kriege und Umbrüche nach 2024 (z. B. in der Ukraine, in Syrien und im Sudan) verändern Bestände laufend.
