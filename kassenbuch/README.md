# Kassenbuch

Einfaches Buchhaltungsprogramm für private Einnahmen und Ausgaben – eine einzige HTML-Datei, läuft komplett im Browser.

## Benutzung

1. `index.html` im Browser öffnen (Doppelklick genügt).
2. Im Online-Banking die Umsätze als **CSV** exportieren und auf die Seite ziehen oder über „Kontoauszug hochladen“ auswählen. Mehrere Dateien gleichzeitig gehen auch.
3. Jede Buchung wird automatisch einer Kategorie zugeordnet (Lebensmittel, Wohnen, Mobilität, Abos …).
4. Stimmt eine Kategorie nicht, in der Tabelle ändern – das Programm merkt sich den Empfänger und ordnet künftige Buchungen genauso zu.

## Funktionen

- Import von CSV-Exporten üblicher Banken (Sparkasse, Volksbank, ING, DKB, Commerzbank, comdirect, N26, Postbank …); Spalten, Trennzeichen, Zeichensatz und deutsches Zahlenformat werden automatisch erkannt
- Kein Download möglich? Umsatzliste im Online-Banking markieren, kopieren und einfügen. Erkannt werden Tabellen, untereinander stehende Angaben und App-Listen mit „Heute“/„Gestern“ oder „10. November 2026“ sowie beschriftete Blöcke („Buchungsdatum: … / Buchungstext: …“, z. B. österreichische Banken). Zwischenzeilen mit dem Tageskontostand werden ignoriert.
- Einzelne Buchungen von Hand eintragen (z. B. Barausgaben)
- Doppelte Buchungen werden beim erneuten Import übersprungen
- Diagramme: Einnahmen/Ausgaben pro Monat, Ausgaben bzw. Einnahmen nach Kategorie, laufender Saldo
- Budgets: Monatslimit pro Kategorie mit Ampel (im Rahmen / knapp / überschritten)
- Abos & Fixkosten: regelmäßige monatliche Zahlungen werden automatisch erkannt, mit Summe pro Monat und Jahr und dem nächsten erwarteten Termin
- Kennzahlen: Einnahmen, Ausgaben, Überschuss, Sparquote
- Filter nach Zeitraum (Jahr/Monat), Kategorie und Suchbegriff
- Eigene Regeln (Stichwort → Kategorie) und eigene Kategorien
- Export als CSV (für Excel)

## Datenschutz

Alle Daten bleiben im `localStorage` deines Browsers. Nichts wird hochgeladen. Wer den Browser-Speicher löscht, löscht auch die Buchungen – vorher am besten als CSV exportieren.
