import {StaticLink} from '../pages/static-link';
'use client';
import {Fragment,useState} from 'react';
import {ChevronDown,Download,ExternalLink} from 'lucide-react';
import inventory from '@/data/retrieval-overview.json';
import {freshness,sourceFreshness,shortDate} from '@/lib/freshness';
import {retentionStart,retentionEnd,timetableStart,timetableEnd} from '@/lib/retention';
import {sourceDescriptions} from '@/lib/source-descriptions';
import {date,format} from './research-controls';

const mb=(bytes:number)=>new Intl.NumberFormat('de-DE',{minimumFractionDigits:3,maximumFractionDigits:3}).format(bytes/1_000_000);
const periods=(value:unknown):string=>value==null?'Nicht separat angegeben':Array.isArray(value)?value.map(periods).join(' '):typeof value==='string'?value:typeof value==='object'?Object.entries(value).map(([key,item])=>key+': '+periods(item)).join(' · '):String(value);
const summaries:Record<string,string>={
 openstation:'Stationsinventar und aktueller Anlagenstatus',
 cartographic_locations:'Kartenpositionen der Bahnhöfe',
 osm:'Kartierte Objekte und Wege im Umfeld',
 bkg:'Verwaltungsgebiete und räumliche Zuordnung',
 delfi:'Planmäßige Abfahrten und Verkehrsangebot',
 dwd:'Stündliche Wetterbeobachtungen',
 zensus:'Bevölkerung, Haushalte und Wohnumfeld',
 facility_history:'Bundesweite Störungsanteile von Anlagen',
 police_statistics:'Bundesweite Kriminalitätsstatistiken',
 skid:'Befragung zum Sicherheitsgefühl',
 operational_archive:'Archivierte Fahrplanänderungen und Ausfälle',
 station_plans:'Stationspläne zur Orientierung',
 mapillary:'Straßenbilder · Zugangstoken fehlt',
 field:'Studienbeobachtungen · noch nicht erhoben',
};

function SourceDetails({row:r,source:s}:{row:typeof inventory.sources[number];source:any}){
 const description=sourceDescriptions[r.sourceId],current=sourceFreshness[r.sourceId];
 return <div className="retrieval-source-body">
  <dl className="source-reading-guide">
   <div><dt>Verwendete Daten</dt><dd>{description?.dataUsed??r.scope}</dd></div>
   <div><dt>Aussagekraft</dt><dd>{description?.meaning??r.integrationNote}</dd></div>
   {description&&<div><dt>Grenzen</dt><dd>{description.limits}</dd></div>}
  </dl>
  <dl className="source-storage"><div><dt>Quelldateien</dt><dd>{mb(r.archiveBytes)} MB</dd></div><div><dt>Aufbereitet</dt><dd>{mb(r.preparedBytes)} MB</dd></div><div><dt>Letzter Download</dt><dd>{r.retrievedAt?date(r.retrievedAt):'Nicht abgerufen'}<small>{format(r.fileCount)} Dateien</small></dd></div></dl>
  <section className="source-freshness" aria-label="Datenstand und Prüfung">
   <h3>{current.referenceLabel}</h3><p><strong>{current.statusLabel}</strong>{current.checkedAt&&<> · geprüft {date(current.checkedAt)}</>}</p><p>{current.summary}</p>
   {current.gaps.length>0&&<ul>{current.gaps.map((gap,i)=><li key={i}>{gap}</li>)}</ul>}
   {current.evidenceUrl&&<StaticLink className="text-link" href={current.evidenceUrl} download>Prüfnachweis mit Quellen und Ergebnissen (JSON)</StaticLink>}
   {r.sourceId==='dwd'&&<><div className="retrieval-table-wrap" tabIndex={0} role="region" aria-label="Zeitliche Abdeckung der Wetterprodukte"><table className="retrieval-datasets"><thead><tr><th scope="col">Wetterprodukt</th><th scope="col">Erste Messung</th><th scope="col">Letzte Messung</th><th scope="col">Messstationen</th></tr></thead><tbody>{(freshness.weatherProducts as any[]).map(product=><tr key={product.id}><td>{product.title}</td><td>{shortDate(product.firstObservation)}</td><td>{shortDate(product.latestObservation)}</td><td>{format(product.stations)}</td></tr>)}</tbody></table></div><p>Produktweite Zeitspanne; einzelne Messstationen und Stunden können fehlen. Die Zuordnung im Profil prüft Ort und Zeitfenster gesondert.</p></>}
  </section>
  <section className="source-processing"><h3>Technischer Abruf- und Verarbeitungsumfang</h3><p>{r.scope}</p><p><strong>Aktueller Verarbeitungsstand:</strong> {r.integrationNote}</p>{r.recordDefinition&&<p>{r.recordDefinition}</p>}
   {r.datasets.length>0&&<><p>Die Datensatzbeschreibungen dokumentieren den Abruf. Frühere Verarbeitungsschritte bleiben als Nachweis erhalten; die aktuelle Nutzung ist oben beschrieben.</p><div className="retrieval-table-wrap" tabIndex={0} role="region" aria-label={'Datensätze: '+r.name}><table className="retrieval-datasets"><thead><tr><th scope="col">Datensatz / Produktgruppe</th><th scope="col">Dateien</th><th scope="col" className="number">MB</th><th scope="col">Quelldatenstand / Inhalt</th></tr></thead><tbody>{r.datasets.map((d:any,i:number)=><tr key={d.title+':'+i}><td>{d.url?<StaticLink href={d.url} target="_blank" rel="noreferrer">{d.title} <ExternalLink size={12}/></StaticLink>:d.title}</td><td>{format(d.fileCount??1)}</td><td className="number">{mb(d.bytes??0)}</td><td>{d.referencePeriod&&<p>{periods(d.referencePeriod)}</p>}{d.notes&&<p>{periods(d.notes)}</p>}{d.records!=null&&<small>{r.sourceId==='dwd'?'Beobachtungszeilen':'Datensätze'}: {periods(d.records)}</small>}</td></tr>)}</tbody></table></div></>}
  </section>
  {r.missing.length>0&&<div className="retrieval-gaps"><h3>Offen / begrenzt</h3><ul>{r.missing.map((m:any,i:number)=><li key={i}>{periods(m)}</li>)}</ul></div>}
  {s&&<dl className="retrieval-definition"><dt>Zugang</dt><dd>{s.access}</dd><dt>Lizenz</dt><dd>{s.licence}</dd><dt>Einordnung</dt><dd>{s.limitations}</dd></dl>}
  <div className="retrieval-links"><StaticLink className="text-link" href={r.inventoryUrl} download><Download size={16}/>Dateiverzeichnis mit Größen, Speicherpfaden und SHA-256{r.inventoryUrl.endsWith('.gz')?' (JSON, gzip)':' (JSON)'}</StaticLink>{s?.url&&<StaticLink className="text-link" href={s.url} target="_blank" rel="noreferrer">Quelldokumentation <ExternalLink size={15}/></StaticLink>}</div>
 </div>;
}

export default function SourceInventory({sources}:{sources:any[]}){
 const [expanded,setExpanded]=useState<Set<string>>(()=>new Set());
 const rows=[...inventory.sources].sort((a,b)=>a.name.localeCompare(b.name,'de',{sensitivity:'base',numeric:true}));
 function toggle(id:string){setExpanded(previous=>{const next=new Set(previous);if(next.has(id))next.delete(id);else next.add(id);return next;});}
 return <div className="retrieval-overview">
  <section className="panel retrieval-summary" aria-label="Abgerufener Datenbestand">
   <div><span>Quelldateien lokal</span><strong>{mb(inventory.totals.archiveBytes)} <small>MB</small></strong><p>{format(inventory.totals.fileCount)} Dateien inklusive Quellenbeschreibungen</p></div>
   <div><span>Für die Anwendung aufbereitet</span><strong>{mb(inventory.totals.preparedBytes)} <small>MB</small></strong><p>Profile, Karten, Wetter und Forschungstabellen</p></div>
   <div><span>Quellen mit Daten</span><strong>{inventory.totals.sourcesWithData} <small>von {inventory.totals.sourceCount}</small></strong><p>Bestandsprüfung {date(inventory.generatedAt)}</p></div>
  </section>
  <div className="retrieval-explanation source-inventory-intro">
   <p>Die Übersicht zeigt, was jede Quelle beiträgt und aus welchem Zeitraum die Daten stammen. Nutzung, Grenzen und Prüfnachweise stehen unter „Details“.</p>
   <dl className="source-periods"><div><dt>Beobachtungszeitraum</dt><dd>{shortDate(retentionStart)}–{shortDate(retentionEnd)}</dd></div><div><dt>Fahrplan & Betriebsarchiv</dt><dd>{shortDate(timetableStart)}–{shortDate(timetableEnd)}</dd></div><div><dt>Referenzen & Live-Status</dt><dd>Eigener Quellenstand je Datensatz</dd></div></dl>
   <div className="source-inventory-notes"><p>GitHub-Pages-Ausgabe: Die Tabelle beschreibt den lokalen Forschungsbestand. Hier veröffentlicht sind die aufbereiteten Anwendungsdaten und alle aufbewahrten DWD-Messwerte in verlustfrei komprimierter Form; die ursprünglichen Roharchive verbleiben im lokalen Projekt. <StaticLink href="/data/pages-build.json" download="pages-build.json">Umfang und Prüfsummen dieser Ausgabe</StaticLink>.</p><details><summary>Zeitbezug, Zuordnung und Größenberechnung</summary><div className="source-inventory-note-body"><p>Bundesweite Quellen können einzelne fehlende Stationen haben; aus gemischten Berichten werden nur Deutschlandwerte verwendet. Ein vollständiger Download belegt keine vollständige Stationsabdeckung. Maßgeblich ist der fachliche Zeitbezug, nicht das Download-Datum. Wetter und historische Anlagenstatusindikatoren bleiben an den Beobachtungszeitraum gebunden. Die veröffentlichte SIRI-Momentaufnahme wird separat mit eigenem Zeitstempel angezeigt. Neue Meldungen erfordern eine neue Website-Ausgabe.</p><p>Beim Fahrplan zählen Abfahrtszeitpunkte im August (Europe/Berlin); notwendige Kalenderbezüge für Nachtfahrten über die Monatsgrenze bleiben erhalten. Das Betriebsarchiv verwendet den Ereigniszeitpunkt des Herausgebers (geänderte Abfahrt, sonst geänderte Ankunft); seine Standardwerte belegen weder tatsächliche Pünktlichkeit noch die Durchführung einer Fahrt.</p><p>Referenzdaten wie Karten, Stationspläne und Zensus nutzen die neueste zugängliche Ausgabe und bilden keine historischen Zustände nach. Ihr Quellenstand darf vor 2024 oder nach August 2026 liegen. Zensus 2022 beschreibt den 15.05.2022, nicht die Bevölkerung im gewählten Analysejahr. Eingeschränkt zugängliche neuere Ausgaben bleiben als Zugangslücke gekennzeichnet.</p><p>Räumliche Auswertungen beginnen an einer belegten Position eines Ausstattungsobjekts. Dieser „Analyseanker“ liegt nicht zwingend in der Bahnhofsmitte und ist für {format(freshness.anchorCount)} Bahnhöfe vorhanden. Sicher zugeordnete Auswertungen stehen im Stationsprofil unter „Integrierte Quellen → Weitere Quellen“; bundesweite Tabellen folgen unter „Ergänzende Daten“.</p><p>„Quelldateien“ umfasst verbleibende Downloads, zeitlich gekürzte Archive und fortgeschriebene Kartenauszüge. Ursprüngliche Eingaben, Verarbeitung und Prüfsummen sind dokumentiert; „Aufbereitet“ zählt die zusätzlich erzeugten Anwendungsdateien. 1 MB entspricht 1.000.000 Byte.</p><p>{inventory.sizeDefinition}</p><p>Quellenprüfung: {shortDate(freshness.asOfDate)}.</p></div></details><StaticLink className="text-link" href="/data/retrieval/overview.json" download="safespace-datenbestand.json"><Download size={16}/>Bestandsübersicht als JSON</StaticLink></div>
  </div>
  <div className="panel retrieval-table-wrap source-overview-wrap"><table className="retrieval-table source-inventory-table" role="table"><caption>Datenbestand nach Quelle <span>{rows.length} Quellen · alphabetisch sortiert</span></caption><colgroup><col style={{width:'39%'}}/><col style={{width:'31%'}}/><col style={{width:'15%'}}/><col style={{width:'15%'}}/></colgroup><thead role="rowgroup"><tr role="row"><th scope="col" role="columnheader">Quelle und Inhalt</th><th scope="col" role="columnheader">Datenstand</th><th scope="col" role="columnheader">Abruf</th><th scope="col" role="columnheader">Details</th></tr></thead><tbody role="rowgroup">
   {rows.map(r=>{const open=expanded.has(r.sourceId),current=sourceFreshness[r.sourceId];return <Fragment key={r.sourceId}>
    <tr className="source-inventory-row" id={'source-'+r.sourceId} data-source-id={r.sourceId} role="row">
     <th scope="row" role="rowheader"><span className="source-inventory-name">{r.name}</span><span className="source-inventory-use">{summaries[r.sourceId]??r.scope}</span></th>
     <td className="source-inventory-dates" role="cell"><span className="source-mobile-label" aria-hidden="true">Datenstand</span><span className="freshness-reference">{current.referenceLabel}</span></td>
     <td className="source-inventory-status" role="cell"><span className={'retrieval-status '+(r.dataFileCount?'retrieved':'pending')}>{r.dataFileCount?(r.status==='partial'?'Teilabruf':'Abgerufen'):r.status==='excluded_by_date'?'Außerhalb des Zeitraums':'Nicht abgerufen'}</span></td>
     <td className="source-inventory-action" role="cell"><button className="source-inventory-toggle" type="button" aria-expanded={open} aria-controls={'source-details-'+r.sourceId} aria-label={(open?'Details schließen: ':'Details öffnen: ')+r.name} onClick={()=>toggle(r.sourceId)}>{open?'Schließen':'Details'}<ChevronDown size={17}/></button></td>
    </tr>
    <tr className="source-inventory-detail-row" id={'source-details-'+r.sourceId} hidden={!open} role="row"><td colSpan={4} role="cell"><SourceDetails row={r} source={sources.find(s=>s.id===r.sourceId)}/></td></tr>
   </Fragment>;})}
  </tbody></table></div>
 </div>;
}
