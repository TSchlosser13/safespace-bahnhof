"""Copy the frontend dependency closure; adapt only the isolated Pages copy."""
from pathlib import Path
import re, shutil, json
HERE=Path(__file__).resolve().parents[1]
ROOT=HERE.parent
DEST=HERE/'source'
seen=set()
def copy(path):
 path=path.resolve()
 if path in seen:return
 if not path.is_relative_to(ROOT) or not path.is_file():raise ValueError(path)
 seen.add(path);relative=path.relative_to(ROOT);out=DEST/relative
 out.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(path,out)
 if path.suffix not in ('.ts','.tsx','.css'):return
 text=path.read_text(encoding='utf-8-sig')
 specs=re.findall(r"(?:from\s*|import\s*|import\(\s*|@import\s*)['\"]([^'\"]+)['\"]",text)
 for spec in specs:
  if not spec.startswith(('.', '@/')):continue
  target=ROOT/spec[2:] if spec.startswith('@/') else path.parent/spec
  candidates=[target]+[Path(str(target)+s) for s in ('.ts','.tsx','.json','.css')]+[target/'index.ts',target/'index.tsx']
  found=next((x for x in candidates if x.is_file()),None)
  if not found:raise ValueError(f'{relative}: unresolved {spec}')
  copy(found)
for entry in ('components/explorer.tsx','app/globals.css','lib/sources.ts','lib/catalogue.ts','lib/station-category-index.ts','data/integration/station-categories.json'):
 copy(ROOT/entry)

def change(relative,old,new):
 file=DEST/relative;text=file.read_text(encoding='utf-8-sig')
 if old not in text:raise ValueError(f'Expected text missing in {relative}: {old[:100]}')
 file.write_text(text.replace(old,new),encoding='utf-8')
for file in list((DEST/'components').rglob('*.tsx'))+list((DEST/'lib').glob('*.ts')):
 text=file.read_text(encoding='utf-8-sig');imports=[]
 if re.search(r'\bfetch\(',text):
  text=re.sub(r'\bfetch\(', 'staticFetch(', text)
  target=Path(__import__('os').path.relpath(DEST/'pages/static-fetch',file.parent)).as_posix()
  if not target.startswith('.'):target='./'+target
  imports.append(f"import {{staticFetch}} from '{target}';")
 if re.search(r'<a(?:\s|>)',text):
  text=re.sub(r'<a(?=\s|>)','<StaticLink',text).replace('</a>','</StaticLink>')
  target=Path(__import__('os').path.relpath(DEST/'pages/static-link',file.parent)).as_posix()
  if not target.startswith('.'):target='./'+target
  imports.append(f"import {{StaticLink}} from '{target}';")
 if imports:text='\n'.join(imports)+'\n'+text
 file.write_text(text,encoding='utf-8')
change('components/profile-view.tsx','<Button size="sm" disabled={busy||!s.map_anchor} onClick={onEnrich}><RefreshCw size={14} className={busy?\'spin\':\'\'}/>{busy?\'Abruf läuft …\':\'OSM-Objekte abrufen\'}</Button>','<p className="legend-caption">Veröffentlichter OSM-Snapshot · Aktualisierung mit einer neuen Website-Ausgabe.</p>')
change('components/profile-view.tsx','Über „OSM-Objekte abrufen“ ergänzen.','In dieser Website-Ausgabe nicht vorhanden.')
change('components/profile-view.tsx','zusätzlich manueller OSM-Objektabruf mit 7 Tagen Cache','statische Veröffentlichung ohne Live-Abruf')
change('components/live-facility-status.tsx','SIRI-Momentaufnahme für diese Station. Neue Meldungen laden Sie über „Jetzt aktualisieren“.','Veröffentlichte SIRI-Momentaufnahme für diese Station. Der Quellzeitstempel gilt; diese Website lädt keine neuen Meldungen.')
change('components/live-facility-status.tsx','<Button variant="outline" size="sm" disabled={loading} onClick={()=>void load(true)}><RefreshCw size={14} className={loading?\'spin\':\'\'}/>{loading?\'Abruf läuft …\':\'Jetzt aktualisieren\'}</Button>','')
change('components/live-facility-status.tsx','Noch kein Anlagenstatus verfügbar. „Jetzt aktualisieren“ ruft eine aktuelle Momentaufnahme ab.','In dieser Website-Ausgabe ist kein Anlagenstatus verfügbar.')
change('components/source-inventory.tsx','Der aktuelle SIRI-Abruf wird separat mit eigenem Zeitstempel angezeigt und lässt sich manuell aktualisieren.','Die veröffentlichte SIRI-Momentaufnahme wird separat mit eigenem Zeitstempel angezeigt. Neue Meldungen erfordern eine neue Website-Ausgabe.')
change('components/source-inventory.tsx','<div className="source-inventory-notes">','<div className="source-inventory-notes"><p>GitHub-Pages-Ausgabe: Die Tabelle beschreibt den lokalen Forschungsbestand. Hier veröffentlicht sind die aufbereiteten Anwendungsdaten und alle aufbewahrten DWD-Messwerte in verlustfrei komprimierter Form; die ursprünglichen Roharchive verbleiben im lokalen Projekt. <StaticLink href="/data/pages-build.json" download="pages-build.json">Umfang und Prüfsummen dieser Ausgabe</StaticLink>.</p>')
change('components/methodology-view.tsx','Lokale Rohsnapshots und versionierte normalisierte Profile bleiben getrennt. OSM-Snapshots werden mit Prüfsumme in der Datenbank gespeichert.','Diese statische Ausgabe enthält gespeicherte Quellsnapshots mit dokumentierten Prüfsummen. Der Importverlauf beschreibt den veröffentlichten Datenbestand; ein neuer Abruf erfordert eine neue Website-Ausgabe.')
change('lib/sources.ts','aktueller SIRI-Abruf im Profil manuell aktualisierbar','veröffentlichte SIRI-Momentaufnahme mit eigenem Zeitstempel')
change('lib/sources.ts',"status_label:'Manueller Abruf'","status_label:'Gespeicherter Snapshot'")
change('lib/sources.ts','zusätzlich bewusst ausgelöste Overpass-Abfragen bis 1.000 m mit sieben Tagen Cache','veröffentlichte Snapshots für Puffer bis 1.000 m')
change('lib/sources.ts','lokal gekürzte ZIPs mit Meldungen','verlustfrei gepackte Archivtabellen mit Meldungen')
# Keep compile-time copies of category/catalogue provenance; public metadata is generated independently.
print(json.dumps({'frontendFiles':len(seen),'destination':str(DEST)}))

change('app/globals.css','@import "tailwindcss";','@import "tailwindcss" source("..");')
for name in ['data/retrieval-overview.json','data/freshness-overview.json']:
 file=DEST/name;text=file.read_text(encoding='utf-8')
 text=text.replace('manuelle Aktualisierung im Stationsprofil','Aktualisierung im lokalen Projekt vor einer neuen Veröffentlichung').replace('Manuelle Aktualisierung im Profil','Aktualisierung im lokalen Projekt vor einer neuen Veröffentlichung').replace('eigenem Zeitstempel und manueller Aktualisierung','eigenem Zeitstempel ohne Live-Aktualisierung')
 file.write_text(text,encoding='utf-8')
