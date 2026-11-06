import {StaticLink} from '../pages/static-link';
"use client";
import {useEffect,useMemo,useState} from 'react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {download,request} from './research-controls';
import {assignedResearchSources,researchDataUrl,researchPeriod,validateResearchTable,type ResearchManifest,type ResearchSource,type ResearchDataset,type ResearchTable,type StationResearch} from '@/lib/research-sources';
const PAGE_SIZE=25;
function cell(value:unknown){if(value===null||value===undefined)return 'Unbekannt';if(typeof value==='boolean')return value?'Ja':'Nein';if(typeof value==='object')return JSON.stringify(value);return String(value);}
function Value({value}:{value:unknown}){const v=cell(value);return /^(https:\/\/|\/data\/integration\/research-sources\/)/.test(v)?<StaticLink href={v} target="_blank" rel="noreferrer">Datei / Quelle öffnen</StaticLink>:<>{v}</>;}
function DatasetTable({entry,provided}:{entry:ResearchDataset|ResearchTable;provided?:ResearchTable}){
 const [data,setData]=useState<ResearchTable|null>(provided??null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[query,setQuery]=useState(''),[page,setPage]=useState(0);
 const rows=useMemo(()=>{const q=query.trim().toLocaleLowerCase('de');return (data?.rows??[]).filter(r=>!q||Object.values(r).some(v=>cell(v).toLocaleLowerCase('de').includes(q)));},[data,query]);
 const current=Math.min(page,Math.max(0,Math.ceil(rows.length/PAGE_SIZE)-1)),last=Math.max(0,Math.ceil(rows.length/PAGE_SIZE)-1);
 async function load(){if(data||busy)return;setBusy(true);setError('');try{setData(validateResearchTable(await request(researchDataUrl((entry as ResearchDataset).dataUrl))));}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 return <details className="research-dataset" onToggle={e=>{if(e.currentTarget.open&&!data&&!busy&&!error)void load();}}><summary>{entry.title} <small>{Array.isArray(entry.rows)?entry.rows.length:entry.rows} Zeilen</small></summary>
 {entry.description&&<p>{entry.description}</p>}<p className="research-date">{researchPeriod(data??entry)}</p>
 {busy&&<p role="status">Quelltabelle wird geladen …</p>}{error&&<p role="alert">{error} <Button size="sm" onClick={load}>Erneut laden</Button></p>}
 {data&&<><div className="research-table-controls"><Input aria-label={'Tabelle filtern: '+entry.title} placeholder="Tabellenwerte filtern …" value={query} onChange={e=>{setQuery(e.target.value);setPage(0);}}/><span>{rows.length.toLocaleString('de-DE')} Treffer</span><Button size="sm" variant="outline" onClick={()=>download('safespace-'+entry.id+'.json',JSON.stringify({...data,rows,exportFilter:query||null,sourceRowCount:data.rows.length},null,2),'application/json')}>Tabelle als JSON</Button></div>
 <div className="integrated-table research-table" tabIndex={0} role="region" aria-label={'Quelltabelle: '+entry.title}><table><caption>{entry.title}</caption><thead><tr>{data.columns.map(k=><th key={k} scope="col">{data.columnLabels?.[k]??k}</th>)}</tr></thead><tbody>{rows.slice(current*PAGE_SIZE,(current+1)*PAGE_SIZE).map((r,i)=><tr key={current*PAGE_SIZE+i}>{data.columns.map(k=><td key={k}><Value value={r[k]}/></td>)}</tr>)}</tbody></table></div>
 {!rows.length&&<p>Keine Zeilen für diesen Filter. Daraus folgt keine beobachtete Abwesenheit.</p>}
 <div className="button-row research-pagination"><Button size="sm" variant="outline" disabled={current===0} onClick={()=>setPage(current-1)}>Vorherige Zeilen</Button><span>{rows.length?current*PAGE_SIZE+1:0}–{Math.min((current+1)*PAGE_SIZE,rows.length)} von {rows.length}</span><Button size="sm" variant="outline" disabled={current===last} onClick={()=>setPage(current+1)}>Weitere Zeilen</Button></div>
 {data.definitions&&<details><summary>Definitionen und Herkunft</summary><pre>{JSON.stringify(data.definitions,null,2)}</pre></details>}
 {(data.sourceUrl??entry.sourceUrl)&&<p><StaticLink href={data.sourceUrl??entry.sourceUrl} target="_blank" rel="noreferrer">Veröffentlichte Originalquelle</StaticLink></p>}</>}
 </details>;
}
function SourcePanel({source,station}:{source:ResearchSource;station?:StationResearch}){
 const tables=station?.datasets??source.datasets;
 return <section className="panel research-source" data-research-source={source.sourceId}><h3>{source.title}</h3><p>{source.summary}</p><p><strong>{!source.datasets.length&&source.status==='access_required'?'Keine Beobachtungen abgerufen':researchPeriod(source)}</strong> · {source.scope}</p>
 {tables.map(entry=><DatasetTable key={entry.id} entry={entry} provided={station?entry as ResearchTable:undefined}/>)}
 {!station&&!!source.downloads?.length&&<div className="button-row">{source.downloads.filter(file=>/^\/data\/integration\/research-sources\/[a-z0-9_/-]+\.geojson$/.test(file.url)&&!file.url.includes('..')).map(file=><StaticLink className="research-download" key={file.url} href={file.url} download>{file.title}{file.features!==undefined?` · ${file.features.toLocaleString('de-DE')} Objekte`:null}</StaticLink>)}</div>}
 {!tables.length&&<p>Keine nutzbaren Daten abgerufen.</p>}
 {!!source.limitations?.length&&<details className="research-limits"><summary>Abdeckung und Grenzen</summary><ul>{source.limitations.map((item,i)=><li key={i}>{item}</li>)}</ul></details>}
 </section>;
}
export default function ResearchSources({manifest:provided,stationId,stationData,loading=false,errors=[],onRetry}:{manifest?:ResearchManifest;stationId?:string;stationData?:Record<string,StationResearch>;loading?:boolean;errors?:string[];onRetry?:()=>void}){
 const [loaded,setLoaded]=useState<ResearchManifest|null>(null),[error,setError]=useState('');const manifest=provided??loaded;
 useEffect(()=>{if(provided||stationId||onRetry)return;let live=true;request('/data/integration/research-sources/manifest.json').then(value=>{if(live)setLoaded(value);}).catch(e=>{if(live)setError(e.message);});return()=>{live=false};},[provided,stationId,onRetry]);
 const sources=(manifest?.sources??[]).filter(source=>!stationId||stationData?.[source.sourceId]);
 const assigned=stationId&&manifest?assignedResearchSources(manifest,stationId):[];
 return <div className="research-sources"><p>{stationId?'Zusätzliche Daten mit belegter Zuordnung zu dieser Station.':'Bundesweite Betriebsarchive, Statistiken, Befragungen und Stationspläne.'} Jede Tabelle gilt für ihren angegebenen Zeitraum und Raumbezug. Das im Profil gewählte Analysedatum und Stundenfenster verändern diese bereits aufbereiteten Tabellen nicht.</p>
 {!stationId&&<p>Nationale Befragungsergebnisse und Kriminalitätsstatistiken sind Kontextdaten; sie werden keinem einzelnen Bahnhof als gemessene Sicherheit zugeschrieben.</p>}
 {(loading||!manifest&&!error&&!errors.length)&&<p role="status">Ergänzende Quellen werden geladen …</p>}{(error||errors.length>0)&&<p role="alert">{[error,...errors].filter(Boolean).join(' · ')} {onRetry&&<Button size="sm" disabled={loading} onClick={onRetry}>Ergänzende Quellen erneut laden</Button>}</p>}
 {sources.map(source=><SourcePanel key={(stationId??'all')+source.sourceId} source={source} station={stationData?.[source.sourceId]}/>)}
 {stationId&&!loading&&manifest&&!sources.length&&!assigned.length&&!errors.length&&<p>Für diese Station ist keine zusätzliche Quelle sicher zugeordnet. Bundesweite Tabellen stehen unter „Quellen & Methodik → Ergänzende Daten“.</p>}
 {stationId&&!loading&&manifest&&!sources.length&&!!assigned.length&&<p>Zusätzliche Quellen sind dieser Station zugeordnet, konnten aber nicht geladen werden. Ihre Werte bleiben bis zum erfolgreichen Abruf unbekannt.</p>}
 {stationId&&!!sources.length&&<p>Weitere bundesweite Tabellen stehen unter „Quellen & Methodik → Ergänzende Daten“.</p>}
 </div>;
}
