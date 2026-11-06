import {staticFetch} from '../pages/static-fetch';
import {StaticLink} from '../pages/static-link';
'use client';

import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {AlertCircle, CheckCircle2, Download, Info, RefreshCw, HelpCircle} from 'lucide-react';
import {Button} from '@/components/ui/button';
import type {LiveFacilityRecord, LiveFacilitySnapshot} from '@/lib/live-facilities';
import {date, download, format} from './research-controls';
import './openstation-data.css';

const typeNames:Record<string,string>={LiftEquipment:'Aufzug',EscalatorEquipment:'Rolltreppe',TravelatorEquipment:'Fahrsteig',StaircaseEquipment:'Treppe',EntranceEquipment:'Zugangsausstattung',RampEquipment:'Rampe',SanitaryEquipment:'Sanitäreinrichtung',PassengerInformationEquipment:'Fahrgastinformation'};
const stateNames:Record<LiveFacilityRecord['status'],string>={available:'Verfügbar gemeldet',notAvailable:'Nicht verfügbar gemeldet',unknown:'Status unbekannt',other:'Unbekannter Quellstatus'};
const descriptionNames:Record<string,string>={available:'Verfügbar', 'not available':'Nicht verfügbar', 'not monitored':'Nicht überwacht', 'monitoring disrupted':'Überwachung gestört', 'monitoring not available':'Überwachung nicht verfügbar', 'under construction':'Im Bau', 'under maintenance':'In Wartung'};
const stateOrder={notAvailable:0,unknown:1,other:2,available:3};
const staleAfterMinutes=5;

function StatusBadge({status}:{status:LiveFacilityRecord['status']}) {
  const Icon=status==='available'?CheckCircle2:status==='notAvailable'?AlertCircle:HelpCircle;
  return <span className={'os-state os-live-status os-state-'+(status==='available'?'yes':status==='notAvailable'?'no':'unknown')}><Icon size={12}/>{stateNames[status]}</span>;
}
const object=(value:unknown):value is Record<string,unknown>=>!!value&&typeof value==='object'&&!Array.isArray(value);
const nullableString=(value:unknown)=>value===null||typeof value==='string';
const stringList=(value:unknown)=>Array.isArray(value)&&value.every(item=>typeof item==='string');
function isRecord(value:unknown):value is LiveFacilityRecord {
  return object(value)&&typeof value.recordId==='string'&&nullableString(value.facilityRef)&&typeof value.status==='string'&&Object.hasOwn(stateNames,value.status)&&['statusRaw','description','recordedAtTime','validUntilTime','stationId','equipmentType','name'].every(field=>nullableString(value[field]))&&Array.isArray(value.descriptions)&&value.descriptions.every(item=>object(item)&&typeof item.text==='string'&&nullableString(item.language))&&['exact','unmatched','ambiguous'].includes(String(value.match))&&stringList(value.qualityFlags);
}
function isSnapshot(value:unknown):value is LiveFacilitySnapshot {
  if(!object(value)||value.schemaVersion!=='openstation-siri-live/1.0'||!['present','unavailable'].includes(String(value.availability))||!object(value.stations)||!Object.values(value.stations).every(rows=>Array.isArray(rows)&&rows.every(isRecord))||!object(value.summary))return false;
  if(!['records','uniqueFacilityRefs','matchedRecords','unmatchedRecords','ambiguousRecords','stationsWithStatus','duplicateFacilityRefs'].every(field=>typeof value.summary==='object'&&value.summary!==null&&typeof (value.summary as Record<string,unknown>)[field]==='number'&&Number.isFinite((value.summary as Record<string,unknown>)[field])))return false;
  if(value.source!==null&&(!object(value.source)||!['name','url','resolvedUrl','licence','responseTimestamp','retrievedAt','sha256','rawPath'].every(field=>typeof (value.source as Record<string,unknown>)[field]==='string')))return false;
  if(value.availability==='present'&&value.source===null)return false;
  if(value.lastRefresh!==null&&(!object(value.lastRefresh)||typeof value.lastRefresh.attemptedAt!=='string'||typeof value.lastRefresh.succeeded!=='boolean'||!nullableString(value.lastRefresh.error)))return false;
  return Array.isArray(value.unmatchedRecords)&&value.unmatchedRecords.every(isRecord)&&stringList(value.qualityFlags)&&typeof value.refreshIntervalSeconds==='number';
}
function newestSnapshot(previous:LiveFacilitySnapshot|null,candidate:LiveFacilitySnapshot):LiveFacilitySnapshot {
  if(!previous?.source)return candidate;
  const lastRefresh=Date.parse(candidate.lastRefresh?.attemptedAt??'')>Date.parse(previous.lastRefresh?.attemptedAt??'')?candidate.lastRefresh:previous.lastRefresh??candidate.lastRefresh;
  if(!candidate.source)return {...previous,lastRefresh};
  const stamp=(snapshot:LiveFacilitySnapshot)=>Date.parse(snapshot.source?.responseTimestamp??'')||Date.parse(snapshot.source?.retrievedAt??'')||0;
  const older=stamp(previous)>stamp(candidate)||(stamp(previous)===stamp(candidate)&&Date.parse(previous.source.retrievedAt)>Date.parse(candidate.source.retrievedAt));
  return older?{...previous,lastRefresh}:candidate;
}
async function getSnapshot(url:string,signal:AbortSignal) {
  const response=await staticFetch(url,{cache:'no-store',signal});
  const body:unknown=await response.json();
  if(!response.ok&&!isSnapshot(body))throw new Error('Die Statusquelle ist derzeit nicht erreichbar.');
  if(!isSnapshot(body))throw new Error('Die Statusantwort konnte nicht gelesen werden.');
  return body;
}

export default function LiveFacilityStatus({stationId,inventoryEquipmentCount}:{stationId:string;inventoryEquipmentCount?:number}) {
  const [snapshot,setSnapshot]=useState<LiveFacilitySnapshot|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState(''),[fallback,setFallback]=useState(false),[filter,setFilter]=useState('all'),[page,setPage]=useState(0),[now,setNow]=useState(()=>Date.now()),[rawOpen,setRawOpen]=useState(false);
  const requestRef=useRef<AbortController|null>(null);
  const load=useCallback(async (refresh=false)=>{
    requestRef.current?.abort();
    const controller=new AbortController();requestRef.current=controller;
    setLoading(true);setError('');
    try {
      const data=await getSnapshot('/api/facility-status'+(refresh?'?refresh=1':''),controller.signal);
      if(controller.signal.aborted)return;
      setSnapshot(previous=>newestSnapshot(previous,data));setFallback(false);setNow(Date.now());
      if(data.lastRefresh?.succeeded===false)setError('Der letzte Abruf ist fehlgeschlagen. Die zuletzt gespeicherte Meldung bleibt sichtbar.');
      else if(data.availability==='unavailable')setError('Es liegt noch kein abrufbarer Status-Snapshot vor.');
    } catch (cause) {
      if(controller.signal.aborted)return;
      try {
        const data=await getSnapshot('/data/integration/siri-live.json',controller.signal);
        if(controller.signal.aborted)return;
        setSnapshot(previous=>newestSnapshot(previous,data));setFallback(true);setNow(Date.now());
        setError(refresh?'Die Aktualisierung ist fehlgeschlagen. Angezeigt wird die neueste bereits bekannte Momentaufnahme.':'Der Statusdienst ist nicht erreichbar. Angezeigt wird die neueste bereits bekannte Momentaufnahme.');
      } catch {
        if(!controller.signal.aborted)setError((cause as Error).message||'Die Anlagenmeldungen konnten nicht geladen werden.');
      }
    } finally {if(!controller.signal.aborted)setLoading(false);}
  },[]);
  useEffect(()=>{void load();return ()=>requestRef.current?.abort();},[load]);
  useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),30000);return ()=>clearInterval(timer);},[]);
  const rows=useMemo(()=>snapshot?.stations[stationId]??[],[snapshot,stationId]);
  const visible=useMemo(()=>rows.filter(row=>filter==='all'||(filter==='unknown'?row.status==='unknown'||row.status==='other':row.status===filter)).sort((a,b)=>stateOrder[a.status]-stateOrder[b.status]||(a.name??'').localeCompare(b.name??'','de')),[rows,filter]);
  const timestamp=snapshot?.source?.responseTimestamp,age=timestamp?(now-Date.parse(timestamp))/60000:NaN,stale=Number.isFinite(age)&&age>staleAfterMinutes,timeUnknown=!Number.isFinite(age)||age < -2;
  const last=Math.max(0,Math.ceil(visible.length/30)-1),current=Math.min(page,last),uniqueFacilities=new Set(rows.map(row=>row.facilityRef).filter(Boolean)).size;
  const counts={available:rows.filter(row=>row.status==='available').length,notAvailable:rows.filter(row=>row.status==='notAvailable').length,unknown:rows.filter(row=>row.status==='unknown'||row.status==='other').length};
  function exportStation() {if(snapshot)download(`siri-anlagenstatus-${stationId}.json`,JSON.stringify({...snapshot,summaryScope:'Nationwide source summary; station records filtered for this export',stations:{[stationId]:rows},unmatchedRecords:[],exportedStationId:stationId,exportedAt:new Date().toISOString()},null,2),'application/json');}
  return <div className="openstation-data" data-live-facility-status={stationId}>
    <div className="os-live-toolbar"><div><span className="os-eyebrow">Aktuelle Meldungen · unabhängig vom Analysezeitraum</span><h3>DB InfraGO · Anlagenstatus</h3><p>Veröffentlichte SIRI-Momentaufnahme für diese Station. Der Quellzeitstempel gilt; diese Website lädt keine neuen Meldungen.</p></div></div>
    {error&&<p className="os-status-line" role="alert">{error}{snapshot?.lastRefresh?.attemptedAt&&<> Letzter Versuch: {date(snapshot.lastRefresh.attemptedAt)}.</>}</p>}
    {loading&&!snapshot&&<p role="status">Anlagenmeldungen werden geladen …</p>}
    {snapshot?.source&&<>
      <div className="os-source-meta"><div><span className="os-eyebrow">{stale||fallback||error?'Zuletzt gespeicherte Momentaufnahme':'Gespeicherte Momentaufnahme'}</span><strong>Quellstand {date(timestamp)}</strong><p>Abgerufen {date(snapshot.source.retrievedAt)} · Uhrzeiten in Europe/Berlin{stale&&<span role="status"> · Quellstand älter als {staleAfterMinutes} Minuten.</span>}</p></div><Button variant="ghost" size="sm" onClick={exportStation}><Download size={14}/>Stationsdaten</Button></div>
      {timeUnknown&&<p className="os-status-line" role="status">Die Aktualität lässt sich anhand des Quellzeitstempels nicht verlässlich beurteilen.</p>}
      {rows.length?<>
        <div className="os-live-stats" aria-label="Gemeldete Anlagenzustände"><span><strong>{format(counts.available)}</strong><StatusBadge status="available"/></span><span><strong>{format(counts.notAvailable)}</strong><StatusBadge status="notAvailable"/></span><span><strong>{format(counts.unknown)}</strong><StatusBadge status="unknown"/></span></div>
        <label className="os-live-filter">Meldungen anzeigen<select value={filter} onChange={event=>{setFilter(event.target.value);setPage(0);}}><option value="all">Alle Meldungen ({rows.length})</option><option value="notAvailable">Nicht verfügbar gemeldet ({counts.notAvailable})</option><option value="unknown">Status unbekannt ({counts.unknown})</option><option value="available">Verfügbar gemeldet ({counts.available})</option></select></label>
        <div className="os-live-list">{visible.slice(current*30,(current+1)*30).map((record,index)=>{
          const expired=record.validUntilTime&&Date.parse(record.validUntilTime)<now;
          return <article className="os-live-item" key={record.recordId+'-'+index}><div className="os-live-item-head"><div><h4>{record.name||typeNames[record.equipmentType??'']||'Anlage ohne veröffentlichten Namen'}</h4><p>{typeNames[record.equipmentType??'']??record.equipmentType??'Ausstattungsart unbekannt'}</p></div><StatusBadge status={record.status}/></div>{record.description&&<p>Quellbeschreibung: {descriptionNames[record.description]??record.description}</p>}<small className="os-source-id">Quellkennung: {record.facilityRef??'Nicht angegeben'}</small>{record.recordedAtTime&&<p><time dateTime={record.recordedAtTime}>Zeitstempel der Einzelmeldung: {date(record.recordedAtTime)}</time></p>}{record.validUntilTime&&<p><time dateTime={record.validUntilTime}>{expired?'Gültigkeit abgelaufen':'Gültig bis'}: {date(record.validUntilTime)}</time></p>}{expired&&<p className="os-note">Nur als letzte bekannte Meldung zu lesen; die angegebene Gültigkeit ist abgelaufen.</p>}{record.status==='other'&&<p>Unbekannter Quellwert: {record.statusRaw??'Nicht angegeben'}</p>}<details className="os-raw"><summary>Originalmeldung und Zuordnung</summary><pre>{JSON.stringify(record,null,2)}</pre></details></article>;
        })}</div>
        {!visible.length&&<p className="os-empty">Keine Meldung entspricht diesem Filter.</p>}
        {last>0&&<div className="os-pagination"><Button size="sm" variant="outline" disabled={current===0} onClick={()=>setPage(current-1)}>Zurück</Button><span>{current+1} / {last+1}</span><Button size="sm" variant="outline" disabled={current===last} onClick={()=>setPage(current+1)}>Weiter</Button></div>}
      </>:<p className="os-status-line"><strong>Keine zugeordnete Statusmeldung für diese Station.</strong> Dies ist keine Aussage darüber, ob Anlagen vorhanden oder betriebsbereit sind.</p>}
      <div className="os-live-coverage"><Info size={15}/><p>{format(uniqueFacilities)} verschiedene Anlagen über identische Quellkennungen zugeordnet{inventoryEquipmentCount!==undefined?' · '+format(inventoryEquipmentCount)+' Ausstattungsobjekte im Infrastrukturinventar':''}. Nicht jede Ausstattungsart wird überwacht. „Status unbekannt“ bedeutet keine bestätigte Störung; eine fehlende Meldung ist kein Verfügbarkeitsnachweis.</p></div>
      <p className="os-note">Der Quellzeitstempel datiert die Antwort, nicht den Beginn einer Störung. Dieser Snapshot liefert keine Ausfallhistorie für den ausgewählten Analysezeitraum und wird nicht mit dessen Indikatoren verrechnet.</p>
      <details className="os-raw" onToggle={event=>setRawOpen(event.currentTarget.open)}><summary>Quelle, bundesweite Abdeckung und Abrufdetails</summary>{rawOpen&&<><p><StaticLink href={snapshot.source.url} target="_blank" rel="noreferrer">OpenStation · SIRI-Originalquelle</StaticLink> · {snapshot.source.licence}</p><p>Deutschlandweit {format(snapshot.summary.records)} Meldungen; {format(snapshot.summary.matchedRecords)} zugeordnet; {format(snapshot.summary.unmatchedRecords)} ohne Zuordnung; {format(snapshot.summary.ambiguousRecords)} mehrdeutig.</p><pre>{JSON.stringify({source:snapshot.source,catalogue:snapshot.catalogue,summary:snapshot.summary,lastRefresh:snapshot.lastRefresh,qualityFlags:snapshot.qualityFlags},null,2)}</pre></>}</details>
    </>}
    {!loading&&!snapshot?.source&&!error&&<p className="os-empty">In dieser Website-Ausgabe ist kein Anlagenstatus verfügbar.</p>}
  </div>;
}
