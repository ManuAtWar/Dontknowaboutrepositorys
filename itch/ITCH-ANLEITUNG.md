# Kapital auf itch.io veröffentlichen

## Dateien in diesem Ordner

| Datei | Wofür |
|---|---|
| `kapital-demo.zip` | **Kostenlose Demo** zum Spielen im Browser: Kurse 1–3, Szenario „Finanzkrise“, ein Spieljahr im freien Spiel |
| `kapital-voll.zip` | **Vollversion** für Käufer: alles freigeschaltet |
| `build_zip.py` | Baut beide ZIPs nach Änderungen neu: `python3 itch/build_zip.py` |
| `cover.png` | Titelbild (630 × 500, genau das Format, das itch.io empfiehlt) |
| `screenshot-1` bis `-6` | Screenshots für die Spielseite |

## Schritt für Schritt

1. Auf **itch.io** ein Konto anlegen. Für Auszahlungen musst du volljährig sein, sonst über ein Elternteil.
2. Oben rechts: **Upload new project**.
3. Felder ausfüllen:

| Feld | Eintrag |
|---|---|
| Title | `Kapital – Investieren lernen` |
| Project URL | z. B. `kapital` |
| Short description | `Lerne investieren, ohne echtes Geld: 123 Lektionen, 6 Krisen-Szenarien und ein Börsenspiel.` |
| Classification | Games |
| Kind of project | **HTML** |
| Release status | Released |
| Pricing | **Name your own price**, empfohlener Preis 4,99 €, Mindestpreis 0 € (oder direkt **Paid** mit 4,99 €) |

4. **Uploads**: zwei Dateien hochladen:
   - `kapital-demo.zip` → Haken bei **This file will be played in the browser**. Diese Version kann jeder kostenlos direkt auf der Seite spielen.
   - `kapital-voll.zip` → **kein** Browser-Haken. Als Namen z. B. `Vollversion (im Browser öffnen: entpacken, index.html doppelklicken)` eintragen. Diese Datei bekommen nur Käufer zum Herunterladen.

   Pricing dafür auf **Paid** (4,99) stellen. Falls die Browser-Demo im privaten Fenster dann nicht für alle spielbar ist, mach zwei Seiten: `kapital-demo` (No payments, nur die Demo-ZIP) und `kapital` (Paid, nur die Voll-ZIP).
5. **Embed options**:
   - Viewport dimensions: **1280 × 800**
   - Haken bei **Mobile friendly** (Orientation: Default)
   - Haken bei **Fullscreen button**
   - Haken bei **Enable scrollbars**
6. **Cover image**: `cover.png` hochladen.
7. **Screenshots**: alle sechs Screenshots hochladen.
8. **Genre**: Educational. **Tags** (siehe unten). **Language**: German.
9. Unten **Visibility** erst auf **Draft** lassen, alles testen, dann auf **Public** stellen.

## Tags

`finance`, `educational`, `simulation`, `stock-market`, `investing`, `german`, `economy`, `management`, `singleplayer`, `learning`

## Beschreibung (zum Einfügen)

> **Lerne investieren, ganz ohne echtes Geld.**
>
> Kapital ist Finanz-Akademie und Börsenspiel in einem. Du lernst, wie man Geld mit möglichst wenig Risiko anlegt, und probierst es direkt mit Spielgeld aus.
>
> **📚 Finanz-Akademie: 123 Lektionen in 12 Kursen**
> Vom Notgroschen über Tagesgeld, ETFs und Anleihen bis zu Steuern, Altersvorsorge und Betrugsmaschen. Jede Lektion dauert etwa zwei Minuten und endet mit einer Quizfrage. Mit Erfahrungspunkten, Lern-Serie und Sparplan-Rechner.
>
> **🎯 6 Szenarien mit Sternen**
> - **Die große Finanzkrise**: Boom, Blase, Crash. Übersteht dein Depot die Krise?
> - **Die Dotcom-Blase**: Tech-Aktien kennen nur eine Richtung … bis sie es nicht mehr tun.
> - **Die Zinswende**: Der Leitzins steigt von 0,5 auf 4,5 %. Was passiert mit Anleihen?
> - **Der Krypto-Rausch**: Machst du mit, wenn alle reich werden?
> - **Der erste Job**: Sparen, während das Leben passiert. Autoreparatur ohne Notgroschen? Dann wird's teuer.
> - **Der Ruhestand**: 400.000 € müssen zehn Jahre reichen, und gleich am Anfang kommt ein Crash.
>
> **📈 Freies Börsenspiel: von 10.000 € zur Milliarde**
> Aktien, ETFs, Anleihen, Rohstoffe, Krypto, Optionen und Kredite. Marktphasen, Zinsentscheide, Börsengänge, Startup-Pitches und Margin Calls. Dein Coach erklärt, was gerade passiert, und der Depot-Check vergleicht dich mit der einfachsten Strategie der Welt: einen Welt-ETF kaufen und liegen lassen.
>
> **✔️** Läuft im Browser, auch auf dem Handy · Spielstand wird automatisch gespeichert · Keine Werbung · Keine Anmeldung
>
> *Alles fiktiv: Spielgeld, erfundene Firmen, simulierte Kurse. Allgemeine Finanzbildung, keine Anlageberatung. Steuer- und Rentenregeln mit Stand 2026.*

## Vor dem Veröffentlichen erledigen

- [ ] Selbst einmal komplett im itch.io-Entwurf testen (Computer und Handy)
- [ ] Finanzinhalte von jemandem mit Fachwissen gegenlesen lassen (vor allem Kurs 9 Steuern und Kurs 10 Altersvorsorge)
- [ ] Namen „Kapital“ beim DPMA (register.dpma.de) auf Markenkonflikte prüfen
- [ ] Bei regelmäßigen Einnahmen: Gewerbe anmelden und Steuern klären (bei unter 18: mit den Eltern)
- [ ] Im itch.io-Profil Kontaktangaben bzw. Impressum hinterlegen, wenn du in Deutschland gewerblich verkaufst

## Hinweise

- Spielstände werden im Browser gespeichert (localStorage). Auf itch.io bleiben sie erhalten, solange Spieler denselben Browser nutzen.
- Die Schriften werden von Google Fonts geladen. Ohne Internet greifen normale Systemschriften, das Spiel funktioniert trotzdem.
- Neue Version hochladen: `python3 itch/build_zip.py` ausführen und auf itch.io die alten Dateien ersetzen. Spielstände bleiben erhalten.
- Der Knopf „Vollversion holen“ in der Demo führt zu `https://manuatwar.itch.io/kapital`. Ändert sich die Adresse, oben in `build_zip.py` bei `BUY_URL` anpassen und neu bauen.
- Käufer der Vollversion spielen offline im Browser. Ihr Spielstand aus der Demo wird dabei nicht übernommen, weil der Browser die Speicher von itch.io und lokalen Dateien trennt.
