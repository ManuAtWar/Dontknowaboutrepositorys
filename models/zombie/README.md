# Zombie-Modelle hier hochladen

Lege hier die `.fbx`- (oder `.glb`-)Dateien ab. Danach werden sie mit
`python3 tools/embed-models.py` in `models/zombie-data.js` verpackt – dann erscheinen
die echten Zombies im Spiel (auch per Doppelklick auf `index.html`).

## Mixamo (kostenlos, Adobe-Konto nötig)

1. Auf **mixamo.com** mit einem kostenlosen Adobe-Konto anmelden.
2. Reiter **Characters** → nach `zombie` suchen → eine Figur auswählen.
3. **Download** → Format `FBX Binary (.fbx)`, Pose `T-pose` → Datei speichern.
4. Reiter **Animations** (die Figur bleibt ausgewählt) → nacheinander suchen und herunterladen:
   - `Zombie Walk`, `Zombie Running`, `Zombie Attack`, `Zombie Dying`,
     `Zombie Scream`, `Zombie Idle`, `Zombie Stand Up`
   - Bei Lauf-Animationen den Haken **In Place** setzen.
   - Download: Format `FBX Binary (.fbx)`, Skin **Without Skin**, 30 FPS.
5. Die Dateinamen so lassen (z. B. `Zombie Walk.fbx`) – das Skript erkennt sie am Namen.
   Die Figur-Datei darf keines dieser Wörter enthalten (walk, run, attack, dying, scream, idle, stand up).

## Hochladen auf GitHub

Im Repository den Branch `claude/nifty-franklin-cguuu2` wählen → in diesen Ordner
`models/zombie` gehen → **Add file → Upload files** → Dateien hineinziehen → **Commit changes**.
(Maximal 25 MB pro Datei über die Webseite.)

**Hinweis:** Mixamo-Dateien darf man in eigenen Spielen verwenden, aber nicht als
Rohdateien weiterverbreiten. Halte das Repository deshalb am besten **privat**.
