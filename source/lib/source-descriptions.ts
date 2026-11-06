import {freshness,shortDate} from './freshness';
const timetable=(freshness as typeof freshness & {timetable:{coverage:{start:string;end:string};counts:{matchedStations:number;unmatchedStations:number}}}).timetable;
const count=(n:number)=>n.toLocaleString('de-DE');
export type SourceDescription = {
  dataUsed: string;
  meaning: string;
  limits: string;
};

/** Plain-language guide to the current integration; retrieval evidence stays in the source inventory. */
export const sourceDescriptions: Record<string, SourceDescription> = {
  openstation: {
    dataUsed: 'Stationsinventar mit Barrierefreiheitsangaben, Kategorien, Bahnsteigmaßen, Zugangsbereichen, Hilfsangeboten und Zuständigkeiten. Ergänzend: aktueller SIRI-Anlagenstatus mit eigenem Zeitstempel und manueller Aktualisierung im Stationsprofil.',
    meaning: `Beschreibt die aktuelle veröffentlichte Ausstattung von ${count(freshness.stationCount)} Bahnhöfen. Der Inventarstand kann nach dem Analysezeitraum liegen und belegt keinen historischen Betriebszustand.`,
    limits: 'Aktueller SIRI-Status gilt zum ausgewiesenen Abrufstand und ergänzt keine historische Verfügbarkeit. Ein durchgehender Funktionsstatus für 01.01.2024–31.08.2026 bleibt unbekannt. Fehlende Angaben bleiben unbekannt; Beleuchtungskategorien sind keine Messwerte.',
  },
  cartographic_locations: {
    dataUsed: 'Geografische Positionen aus Stationsverzeichnissen, über eindeutige Stationskennungen zugeordnet. Für 5.392 der 5.393 Bahnhöfe liegt eine passende Kartenposition vor.',
    meaning: 'Legt fest, wo das Bahnhofssymbol auf der Übersichtskarte erscheint.',
    limits: 'Für Lindaunis fehlt eine sichere Zuordnung. Eine Kartenposition allein reicht nicht aus, um die Umgebung eines Bahnhofs auszuwerten.',
  },
  osm: {
    dataUsed: 'Kartierte Geschäfte und Gastronomie, Leuchten, Bänke, Fahrradabstellanlagen, Fußwege und Unterführungswege im Umkreis von 250, 500 oder 1.000 Metern.',
    meaning: `Zeigt Lage und Anzahl veröffentlichter Objekte im Bahnhofsumfeld. Die Auswertung ist für ${count(freshness.anchorCount)} Bahnhöfe mit einem belegten Ausgangspunkt möglich.`,
    limits: 'OpenStreetMap wird gemeinschaftlich gepflegt und kann Lücken enthalten. Leuchten sind keine Helligkeitsmessung; Wegabschnitte sind keine vollständigen Routen. Komplexe Objektgruppen werden nicht mitgezählt.',
  },
  bkg: {
    dataUsed: 'Amtliche Grenzen von Deutschland, Bundesländern, Regierungsbezirken und Kreisen mit Stand 31.12.2025. Verfügbare Ausgangspunkte der Bahnhöfe werden diesen Gebieten zugeordnet.',
    meaning: 'Ordnet den Bahnhof räumlich ein: In welchem Bundesland, Regierungsbezirk oder Kreis liegt der dokumentierte Ausgangspunkt?',
    limits: 'Die Grenzen sind für eine großräumige Kartendarstellung vereinfacht. Sie zeigen keine Grundstücks- oder Bahnhofsgrenzen.',
  },
  delfi: {
    dataUsed: 'Planmäßige Abfahrtszeiten, Linien, Fahrtrichtungen, Verkehrsmittel und Verkehrstage. Daraus entstehen Abfahrtszahlen, Abfahrten je Stunde sowie die erste, letzte und zeitlichen Abstände der Abfahrten.',
    meaning: `Beschreibt das geplante Verkehrsangebot im gewählten Zeitfenster. ${count(timetable?.counts.matchedStations??0)} Bahnhöfe sind sicher zugeordnet. Abfahrtszeitraum: ${shortDate(timetable?.coverage.start)}–${shortDate(timetable?.coverage.end)}.`,
    limits: `${count(timetable?.counts.unmatchedStations??0)} Bahnhöfe bleiben ohne sichere Zuordnung. Nur August 2026 ist ausgewählt. Nachtfahrten am 01.08. werden nach ihrem tatsächlichen Abfahrtsdatum zugeordnet, auch wenn ihr Verkehrstag im Juli beginnt. Der Exportstand und mögliche spätere Fahrplankorrekturen sind separat dokumentiert. Das ZHV-Verzeichnis dient der Kennungszuordnung; sein Quellenstand und Zugangslücken werden gesondert ausgewiesen. Die Werte sind geplante Fahrten, keine Echtzeitmeldungen oder Fahrgastzahlen.`,
  },
  dwd: {
    dataUsed: 'Stündliche Wetterberichte vom 01.01.2024 bis einschließlich 31.08.2026, in 15 Produktgruppen, etwa Temperatur, Niederschlag, Wind, Bewölkung und Sichtweite. Im Profil werden Temperaturmittel und Niederschlagsmeldungen ausgewertet; weitere Originalwerte sind einsehbar.',
    meaning: 'Beschreibt das regionale Wetter im gewählten Zeitfenster anhand einer passenden Wetterstation in höchstens 50 Kilometern Entfernung.',
    limits: 'Messungen außerhalb des Zeitraums wurden auch aus gemischten Archiven entfernt. Keine Messung direkt am Bahnhof. Zeiträume und Messlücken unterscheiden sich; aktuelle Berichte können vorläufig sein. Die Niederschlagssumme bezieht sich auf Meldungen im Zeitfenster, nicht auf eine exakt zeitlich abgegrenzte Regenmenge vor Ort.',
  },
  
  
  zensus: {
    dataUsed: 'Neueste angebotene Zensusraster zu Bevölkerung, Haushalten, Gebäuden und Wohnungen. Für Bahnhöfe mit belegtem Ausgangspunkt werden Bevölkerungszellen im gewählten Radius und Originalwerte weiterer Themen verknüpft.',
    meaning: 'Beschreibt das Wohnumfeld zum 15.05.2022. Als neueste Referenzausgabe bleibt dieser Datenstand unabhängig vom gewählten Wetter- oder Fahrplandatum erhalten; er ist keine Bevölkerungsmessung für 2024–2026.',
    limits: 'Raster und Geheimhaltung begrenzen die Aussage. Fehlende oder geschützte Zellen werden nicht als null Personen behandelt. Veröffentlichte Teilsummen sind keine vollständige Bevölkerung und keine garantierte Untergrenze.',
  },
  facility_history: {
    dataUsed: "Veröffentlichte WDR-Auswertung: zwei bundesweite Tagesreihen zu Aufzugs- und Rolltreppenstörungen mit jeweils 182 Werten vom 01.10.2025 bis 31.03.2026.",
    meaning: "Zeigt den veröffentlichten täglichen Störungsanteil für Deutschland. Die Werte beschreiben das bundesweite Anlagenkollektiv und keine einzelne Station.",
    limits: "Nur der ausgewiesene Teilzeitraum; keine vollständige Historie seit 2024 und keine SIRI-Einzelmeldungen. Regionale Serien und Stationsrankings wurden entfernt.",
  },
  
  police_statistics: {
  "dataUsed": "14 veröffentlichte Deutschlandwerte der Bundespolizei nach Berichtsjahr und Deliktsgruppe für 2024 und 2025. Regional- und Einzelbahnhofstabellen sind entfernt.",
  "meaning": "Beschreibt registrierte Straftaten im bundesweiten Zuständigkeitsbereich der Quelle und liefert einen nationalen Vergleichsrahmen für die Forschung.",
  "limits": "Keine stationsbezogene Sicherheitsbewertung oder Risikorate. Erfassung und Deliktsdefinitionen folgen der Veröffentlichung; fehlende Zahlen bleiben unbekannt."
},
  skid: {
  "dataUsed": "Veröffentlichte Ergebnisse der BKA-Befragung SKiD 2024 zum Sicherheitsgefühl an Bahnhöfen bei Tag und Nacht, einschließlich verfügbarer Gruppenvergleiche.",
  "meaning": "Nationaler Vergleichsrahmen für die Forschung zu subjektiver Sicherheit. Befragungswerte beschreiben Wahrnehmungen der befragten Bevölkerung und können die Entwicklung eigener Fragen unterstützen.",
  "limits": "Keine Bewertung einzelner Bahnhöfe und keine eigenen Teilnehmendendaten. Nur zeitlich zulässige Wahrnehmungsangaben werden verwendet; rückblickende Viktimisierungsangaben für 2023 und Vergleiche mit 2020 wurden ausgeschlossen."
},
  operational_archive: {
  "dataUsed": "Archivierte DB-API-Meldungen aus August 2026: planmäßige und zuletzt gemeldete geänderte Ankunfts- und Abfahrtszeiten sowie Ausfallkennzeichen. Aufbereitung als Monats- und Tagestabellen; Stationszuordnung nur über eindeutige EVA-Kennungen.",
  "meaning": "Beschreibt den Inhalt eines unabhängigen Betriebsdatenarchivs und ergänzt den Sollfahrplan um gemeldete Änderungen. Tageszahlen und Bezugsgrößen helfen, die tatsächliche Datenabdeckung einzuschätzen.",
  "limits": "Community-Archiv, kein vollständiges amtliches Ist-Fahrtenregister. Der Herausgeber ersetzt fehlende Änderungszeiten durch Planzeiten und fehlende Ausfallkennzeichen durch false. Null Minuten belegen daher keine beobachtete Pünktlichkeit; false bestätigt keine Durchführung. Keine Fahrgastzahlen."
},
  station_plans: {
  "dataUsed": "Öffentlich verfügbare DB-Stationspläne für mehrere Bahnhöfe in Deutschland. Die Prüfung dokumentiert vorhandene PDF-Dateien, fehlende Pläne und Quellenstände je Station.",
  "meaning": "Ergänzt die Orientierung zu Bahnsteigen, Zugängen, Unterführungen und eingezeichneten Dienstleistungen. Verfügbare Pläne sind im zugeordneten Stationsprofil direkt zugänglich.",
  "limits": "Nur tatsächlich verfügbare und geprüfte Pläne. Aktuelle Referenzdokumente rekonstruieren keine historischen Zustände; eingezeichnete Angebote belegen keine aktuelle Personalpräsenz oder Funktionsfähigkeit. Ein fehlender Plan bedeutet keine fehlende Ausstattung."
},
  
  mapillary: {
  "dataUsed": "Derzeit keine Bilder oder Bildmetadaten abgerufen. Die Dokumentation des Anbieters verlangt für den automatischen Zugriff einen Zugangstoken, der nicht bereitgestellt wurde.",
  "meaning": "Straßenbilder könnten sichtbare Zugänge, Hindernisse und Zustand zum Aufnahmezeitpunkt ergänzen. Diese Möglichkeit ist als Zugangslücke dokumentiert und liefert derzeit keine Stationswerte.",
  "limits": "Örtliche und zeitliche Abdeckung sind ungeprüft. Bei einem späteren Import wären nur Aufnahmen vom 01.01.2024 bis 31.08.2026 zulässig. Ein Foto liefert keine Lux-Messung und keine durchgehende Zustandshistorie."
},
  field: {
    dataUsed: 'Derzeit keine: Es liegen keine freigegebenen Beobachtungen, Messungen oder Befragungsantworten aus einer Studie vor.',
    meaning: 'Erst solche Erhebungen könnten zum Beispiel anwesende Personen, Sauberkeit, Beleuchtungsstärke oder persönlich empfundene Sicherheit beschreiben.',
    limits: 'Diese Angaben bleiben als nicht erhoben gekennzeichnet. Sie werden nicht aus Karten, Ausstattung oder Wetterdaten geschätzt.',
  },
};
