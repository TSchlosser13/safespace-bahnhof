import {staticFetch} from '../pages/static-fetch';
import {StaticLink} from '../pages/static-link';
'use client';

import {useEffect, useState, type ReactNode} from 'react';
import {Download, RefreshCw} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Tabs, TabsContent, TabsList, TabsTrigger} from '@/components/ui/tabs';
import {openStationDetailsPath, type OpenStationDetails, type OpenStationAccessibility, type OpenStationRecord, type OpenStationPlace, type OpenStationSchedule} from '@/lib/openstation-details';
import {parseStationCategory} from '@/lib/station-category';
import {date, format} from './research-controls';
import './openstation-data.css';

const accessibilityLabels: Record<string, string> = {
  MobilityImpairedAccess: 'Zugang bei Mobilitätseinschränkung', WheelchairAccess: 'Rollstuhlzugang', StepFreeAccess: 'Stufenfreier Zugang', StairFreeAccess: 'Zugang ohne Treppen', EscalatorFreeAccess: 'Zugang ohne Rolltreppen', LiftFreeAccess: 'Zugang ohne Aufzug', RampFreeAccess: 'Zugang ohne Rampen', LevelAccessIntoVehicle: 'Niveaugleicher Fahrzeugeinstieg', AudibleSignalsAvailable: 'Akustische Signale', VisualSignsAvailable: 'Visuelle Beschilderung', TactileGuidanceAvailable: 'Taktile Führung', GuideDogAccess: 'Zugang mit Blindenführhund',
};
const valueLabels: Record<string, string> = {true:'Ja', false:'Nein', partial:'Teilweise', unknown:'Unbekannt', outdoors:'Im Freien', mixed:'Gemischt', indoors:'Innenbereich', covered:'Überdacht', wellLit:'Gut beleuchtet (Quellkategorie)', openArea:'Offener Bereich', passage:'Durchgang', underpass:'Unterführung', overpass:'Überführung', concourse:'Verteilerebene', hall:'Halle', passageway:'Durchgang', footpath:'Fußweg', subway:'Unterführung'};
const equipmentLabels: Record<string, string> = {PassengerInformationEquipment:'Fahrgastinformation', StaircaseEquipment:'Treppen', AccessVehicleEquipment:'Einstiegshilfen', LiftEquipment:'Aufzüge', SanitaryEquipment:'Sanitäreinrichtungen', EntranceEquipment:'Zugangsausstattung', RampEquipment:'Rampen', ShelterEquipment:'Unterstände', EscalatorEquipment:'Rolltreppen', TravelatorEquipment:'Fahrsteige', TicketingEquipment:'Fahrscheinverkauf'};
const fieldLabels: Record<string, string> = {Name:'Name',AssistanceFacilityList:'Unterstützungsangebote', AssistanceAvailability:'Verfügbarkeit', Staffing:'Personalbesetzung', Languages:'Sprachen', AccessibilityTrainedStaff:'Für Barrierefreiheit geschultes Personal', AccessSpaceType:'Bereichstyp', Lighting:'Beleuchtung', Covered:'Überdachung / Lage', Gated:'Zugangskontrolle', Width:'Breite', PublicCode:'Öffentliche Kennung', QuayType:'Bahnsteigtyp'};
const dayLabels: Record<string, string> = {Monday:'Montag', Tuesday:'Dienstag', Wednesday:'Mittwoch', Thursday:'Donnerstag', Friday:'Freitag', Saturday:'Samstag', Sunday:'Sonntag', Weekdays:'Werktage', Weekend:'Wochenende', Everyday:'Täglich', MondayToFriday:'Montag–Freitag', MondayToSaturday:'Montag–Samstag', None:'Nicht angegeben'};
const assistanceLabels: Record<string, string> = {boardingAssistance:'Einstiegshilfe',wheelchairAssistance:'Unterstützung für Rollstuhlnutzende',availableIfBooked:'Nach Voranmeldung verfügbar',partTime:'Zeitweise besetzt',fullTime:'Durchgehend besetzt',unstaffed:'Ohne Personal',NationalHoliday:'Nationaler Feiertag',RegionalHoliday:'Regionaler Feiertag',LocalHoliday:'Lokaler Feiertag',NotHoliday:'Kein Feiertag',Holiday:'Feiertag',de:'Deutsch', 'de-DE':'Deutsch (de-DE)'};
const stationCategoryDescriptions: Record<number, string> = {
  1: 'Meist großer, wichtiger Knotenbahnhof.',
  2: 'Meist großer, wichtiger Knotenbahnhof.',
  3: 'Häufig Hauptbahnhof einer kleineren oder mittleren Stadt.',
  4: 'Häufig durch Regional- und Stadtverkehr geprägt.',
  5: 'Meist geringere Verkehrsbedeutung und einfachere Ausstattung.',
  6: 'Meist geringere Verkehrsbedeutung und einfachere Ausstattung.',
  7: 'Kleiner, einfacher Haltepunkt.',
};
const scheduleTime = (value:string|null) => value==null?'?':/^23:59:59\.9+$/.test(value)?'24:00':value.replace(/^(\d{2}:\d{2}):00(?:\.0+)?$/, '$1');
const label = (value: string | null | undefined) => value == null || value === '' ? 'Nicht angegeben' : valueLabels[value] ?? value;
const assistanceValue = (value: string) => value.split(/\s+/).map(item=>assistanceLabels[item]??label(item)).join(' · ');
const displayName = (record: OpenStationRecord) => record.name || record.fields.PublicCode || 'Ohne veröffentlichten Namen';
const quayType = (record: OpenStationRecord) => ({railIslandPlatform:'Physischer Bahnsteig', railPlatform:'Bahnsteigkante', railPlatformSector:'Sektor'}[record.fields.QuayType] ?? record.fields.QuayType ?? record.type);
function InformationType({value}:{value:string|null}) {return <>{!value?'Nicht angegeben':value.endsWith(':DepMon')?'Abfahrtsmonitor':value.endsWith(':DepAnnouncements')?'Ansageanlage':value.endsWith(':HelpDesk')?'Informationsschalter':value}</>;}

function RawDetails({value, title='Originalfelder anzeigen'}:{value:unknown;title?:string}) {
  const [open,setOpen]=useState(false);
  return <details className="os-raw" onToggle={event=>setOpen(event.currentTarget.open)}><summary>{title}</summary>{open&&<pre>{JSON.stringify(value,null,2)}</pre>}</details>;
}
function State({value}:{value:string|null|undefined}) {return <span className={'os-state os-state-'+(value==='true'?'yes':value==='false'?'no':value==='partial'?'partial':'unknown')}>{label(value)}</span>;}
function Accessibility({assessment}:{assessment:OpenStationAccessibility|null}) {
  return <div className="os-accessibility">{Object.entries(accessibilityLabels).map(([field,name])=><div key={field}><span>{name}</span><State value={assessment?.flags[field as keyof typeof assessment.flags]}/></div>)}</div>;
}
function DataTable<T>({rows,columns,empty='Keine Einträge veröffentlicht.'}:{rows:T[];columns:{label:string;render:(row:T)=>ReactNode}[];empty?:string}) {
  const [page,setPage]=useState(0), last=Math.max(0,Math.ceil(rows.length/30)-1), current=Math.min(page,last);
  if(!rows.length)return <p className="os-empty">{empty}</p>;
  return <><div className="os-table-scroll"><table className="os-table"><thead><tr>{columns.map(column=><th key={column.label} scope="col">{column.label}</th>)}</tr></thead><tbody>{rows.slice(current*30,(current+1)*30).map((row,index)=><tr key={index}>{columns.map(column=><td key={column.label}>{column.render(row)}</td>)}</tr>)}</tbody></table></div>{last>0&&<div className="os-pagination"><Button size="sm" variant="outline" onClick={()=>setPage(current-1)} disabled={current===0}>Zurück</Button><span>{current*30+1}–{Math.min((current+1)*30,rows.length)} von {format(rows.length)}</span><Button size="sm" variant="outline" onClick={()=>setPage(current+1)} disabled={current===last}>Weiter</Button></div>}</>;
}
function Identity({record}:{record:OpenStationRecord}) {return <><strong>{displayName(record)}</strong><small className="os-source-id">{record.id??'Quellkennung fehlt'}</small></>;}
function PlaceAccessibility({title,places}:{title:string;places:OpenStationPlace[]}) {
  return <details className="os-group"><summary>{title}<span>{format(places.length)}</span></summary><p className="os-note">Jedes Quellobjekt behält seine eigene Bewertung. Fehlende Angaben werden nicht auf die gesamte Station übertragen.</p>{places.map((place,index)=><details key={place.id??index} className="os-subgroup"><summary>{displayName(place)}<small>{place.fields.QuayType?quayType(place):label(place.fields.AccessSpaceType)}</small></summary><small className="os-source-id">{place.id}</small><Accessibility assessment={place.accessibility}/><RawDetails value={place.accessibility?.raw??null}/></details>)}{!places.length&&<p className="os-empty">Keine Objekte veröffentlicht.</p>}</details>;
}
function Schedule({schedule}:{schedule:OpenStationSchedule}) {
  const days=schedule.daysOfWeek?.split(/\s+/).map(day=>dayLabels[day]??day).join(', ');
  return <div className="os-schedule"><strong>{days||schedule.name||'Veröffentlichte Zeitregel'}</strong><span>{schedule.timebands.length?schedule.timebands.map(band=>scheduleTime(band.start)+'–'+scheduleTime(band.end)).join(' · ')+' Uhr':'Keine Uhrzeiten angegeben'}</span>{schedule.holidaysOnly&&<small>Feiertagsregel: {assistanceValue(schedule.holidaysOnly)}</small>}<RawDetails value={schedule.raw} title="Zeitregel im Original"/></div>;
}

function DetailsContent({data,path}:{data:OpenStationDetails;path:string}) {
  const info=data.equipment.filter(record=>record.type==='PassengerInformationEquipment');
  const counts=Object.entries(equipmentLabels).map(([type,name])=>({type,name,records:data.equipment.filter(record=>record.type===type)})).filter(group=>group.records.length);
  for(const type of new Set(data.equipment.map(record=>record.type)))if(!equipmentLabels[type])counts.push({type,name:type,records:data.equipment.filter(record=>record.type===type)});
  const names=data.station.names.filter((name,index,list)=>list.findIndex(other=>other.text===name.text&&other.language===name.language)===index);
  const stationCategory=parseStationCategory(data.station.stationCategory);
  return <>
    <div className="os-source-meta"><div><span className="os-eyebrow">Veröffentlichtes Stationsinventar</span><strong>DB InfraGO · OpenStation</strong><p>Quelldatenstand {date(data.provenance.publicationTime)} · Abruf {date(data.provenance.retrievedAt)}</p></div><StaticLink href={path} download className="os-download"><Download size={15}/>Stationsdaten</StaticLink></div>
    <dl className="os-key-facts"><div><dt>Stationskategorie</dt><dd><span className="os-fact-value">{label(data.station.stationCategory)}</span><span className="os-fact-description">{stationCategory===null?'Keine Einordnung verfügbar.':stationCategoryDescriptions[stationCategory]}</span></dd></div><div><dt>Preiskategorie</dt><dd><span className="os-fact-value">{label(data.station.priceCategory)}</span><span className="os-fact-description">Tarifklasse für die Stationsnutzung durch Bahnunternehmen; kein Fahrkartenpreis.</span></dd></div><div><dt>Ausstattungsobjekte</dt><dd>{format(data.equipment.length)}</dd></div><div><dt>Unterstützungsangebote</dt><dd>{format(data.assistanceServices.length)}</dd></div></dl>
    <p className="os-note">Die sieben Stationskategorien berücksichtigen Infrastruktur, Verkehrsbedeutung und Ausstattung. Die Beschreibungen nennen typische Merkmale. <StaticLink href="https://www.dbinfrago.com/web/bahnhoefe/leistungen/stationsnutzung/stationshalt/entgeltsystem-10995748" target="_blank" rel="noreferrer">DB-Kategorie- und Preissystem</StaticLink></p>
    <p className="os-note">Die Angaben beschreiben den datierten Bestand. „Unbekannt“ ist ein Quellwert, „Nicht angegeben“ bedeutet ein fehlendes Feld. Beide bedeuten weder „Nein“ noch null.</p>
    <Tabs defaultValue="accessibility" className="os-tabs"><TabsList aria-label="Zusätzliche OpenStation-Daten"><TabsTrigger value="accessibility">Barrierefreiheit</TabsTrigger><TabsTrigger value="platforms">Bahnsteige</TabsTrigger><TabsTrigger value="services">Ausstattung & Hilfe</TabsTrigger><TabsTrigger value="structure">Struktur & Quelle</TabsTrigger></TabsList>
      <TabsContent value="accessibility"><h3>Bewertung der Station</h3><Accessibility assessment={data.station.accessibility}/><p className="os-note">Veröffentlichte Zugangsbewertungen; keine Garantie einer durchgängig nutzbaren Verbindung. Aktuelle Anlagenmeldungen sind separat einsehbar.</p><PlaceAccessibility title="Bahnsteige, Kanten und Sektoren" places={data.quays}/><PlaceAccessibility title="Zugangsbereiche" places={data.accessSpaces}/><PlaceAccessibility title="Eingänge" places={data.entrances}/><RawDetails value={data.station.accessibility?.raw??null} title="Bewertung der Station im Original"/></TabsContent>
      <TabsContent value="platforms"><h3>Bahnsteige, Kanten und Sektoren</h3><p className="os-note">Maße gelten jeweils für das genannte Quellobjekt. Beleuchtung ist eine veröffentlichte Kategorie, keine Helligkeitsmessung.</p><DataTable rows={data.quays} columns={[{label:'Quellobjekt',render:r=><Identity record={r}/>},{label:'Typ',render:quayType},{label:'Breite',render:r=>r.fields.Width?format(Number(r.fields.Width))+' m':'Nicht angegeben'},{label:'Überdachung / Lage',render:r=>label(r.fields.Covered)},{label:'Beleuchtung',render:r=>label(r.fields.Lighting)},{label:'Zugangskontrolle',render:r=>label(r.fields.Gated)}]}/><RawDetails value={data.quays} title="Alle Bahnsteigmerkmale und Beziehungen"/></TabsContent>
      <TabsContent value="services"><h3>Unterstützung vor Ort</h3>{data.assistanceServices.length?data.assistanceServices.map((service,index)=><section className="os-service" key={service.id??index}><h4>{displayName(service)}</h4><dl className="os-fields">{Object.entries(service.fields).filter(([field])=>field!=='Name').map(([field,value])=><div key={field}><dt>{fieldLabels[field]??field}</dt><dd>{assistanceValue(value)}</dd></div>)}</dl>{service.schedules.length?service.schedules.map((schedule,i)=><Schedule key={i} schedule={schedule}/>):<p className="os-empty">Keine Zeitregel veröffentlicht.</p>}<small className="os-source-id">{service.id}</small><RawDetails value={service.raw} title="Vollständiges Angebot mit Verfügbarkeitsbedingungen"/></section>):<p className="os-empty">Kein Unterstützungsangebot im Bestand veröffentlicht. Dies belegt nicht, dass vor Ort keine Hilfe verfügbar ist.</p>}<p className="os-note">Zeitregeln sind veröffentlichte Angebotsangaben. Eine heutige Personalbesetzung oder Buchbarkeit wird daraus nicht abgeleitet.</p>
        <h3>Fahrgastinformation</h3><div className="os-inline-counts">{[['DepMon','Abfahrtsmonitore'],['DepAnnouncements','Ansageanlagen'],['HelpDesk','Informationsschalter']].map(([suffix,name])=><span key={suffix}><strong>{format(info.filter(record=>record.passengerInformationTypeRef?.endsWith(':'+suffix)).length)}</strong> {name}</span>)}</div><DataTable rows={info} columns={[{label:'Objekt',render:r=><Identity record={r}/>},{label:'Art der Information',render:r=><InformationType value={r.passengerInformationTypeRef}/>},{label:'Verknüpfte Standorte',render:r=>format(r.equipmentPlaceRefs.length)}]}/>
        <h3>Alle Ausstattungsarten</h3>{counts.map(group=><details key={group.type} className="os-group"><summary>{group.name}<span>{format(group.records.length)}</span></summary><DataTable rows={group.records} columns={[{label:'Quellobjekt',render:r=><Identity record={r}/>},{label:'Standortbeziehungen',render:r=>r.equipmentPlaceRefs.length},{label:'Wegbeziehungen',render:r=>r.pathRefs.length},{label:'Weitere Angaben',render:r=><RawDetails value={r}/>}]}/></details>)}<p className="os-note">Mehrere Standorte können dasselbe Ausstattungsobjekt beschreiben. Ein Inventareintrag bestätigt keine aktuelle Funktion.</p></TabsContent>
      <TabsContent value="structure"><h3>Veröffentlichte Namen</h3><dl className="os-fields">{names.map((name,index)=><div key={index}><dt>{name.language||'Sprache nicht angegeben'}</dt><dd>{name.text}</dd></div>)}</dl>
        <details className="os-group" open><summary>Zugangsbereiche<span>{format(data.accessSpaces.length)}</span></summary><DataTable rows={data.accessSpaces} columns={[{label:'Quellobjekt',render:r=><Identity record={r}/>},{label:'Bereichstyp',render:r=>label(r.fields.AccessSpaceType)},{label:'Durchgangsart',render:r=>label(r.fields.PassageType)},{label:'Lage',render:r=>label(r.fields.Covered)},{label:'Weitere Angaben',render:r=><RawDetails value={r}/>}]}/></details>
        <details className="os-group"><summary>Weg- und Objektbeziehungen<span>{format(data.paths.length)}</span></summary><p className="os-note">Diese Referenzen verbinden Quellobjekte. Sie ergeben kein bestätigtes vollständiges Wegenetz und keine belastbaren Routendistanzen.</p><DataTable rows={data.paths} columns={[{label:'Weg',render:r=><Identity record={r}/>},{label:'Von',render:r=><small className="os-source-id">{r.from??'Nicht angegeben'}</small>},{label:'Nach',render:r=><small className="os-source-id">{r.to??'Nicht angegeben'}</small>},{label:'Ausstattung',render:r=>r.equipmentRefs.length},{label:'Original',render:r=><RawDetails value={r}/>}]}/></details>
        <details className="os-group"><summary>Ausstattungsstandorte<span>{format(data.equipmentPlaces.length)}</span></summary><DataTable rows={data.equipmentPlaces} columns={[{label:'Quellobjekt',render:r=><Identity record={r}/>},{label:'Angaben & Referenzen',render:r=><RawDetails value={r}/>}]}/></details>
        <details className="os-group"><summary>Ebenen<span>{format(data.levels.length)}</span></summary><DataTable rows={data.levels} columns={[{label:'Ebene',render:r=><Identity record={r}/>},{label:'Angaben',render:r=><RawDetails value={r}/>}]} empty="Keine Ebenen veröffentlicht. Ein detailliertes Geschossmodell ist daraus nicht ableitbar."/></details>
        <h3>Zuständigkeit</h3>{data.responsibility.organisations.length?<DataTable rows={data.responsibility.organisations} columns={[{label:'Organisation',render:r=><Identity record={r}/>},{label:'Angaben',render:r=><dl className="os-fields">{Object.entries(r.fields).map(([key,value])=><div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}</dl>}]}/>:<p className="os-empty">Keine aufgelöste Organisation veröffentlicht.</p>}<RawDetails value={data.responsibility} title="Zuständigkeitsrollen und Referenzen"/>
        <h3>Quelle und Nachvollziehbarkeit</h3><p><StaticLink href={data.provenance.sourceUrl} target="_blank" rel="noreferrer">OpenStation-Originalquelle</StaticLink> · {data.provenance.licence}</p><p className="os-note">Das Analysedatum verändert diesen Inventarstand nicht. Die zusätzlichen Daten wurden aus dem bereits gespeicherten Infrastrukturdownload verarbeitet.</p><RawDetails value={{source:data.provenance,qualityFlags:data.qualityFlags,station:data.station}} title="Herkunft, Qualitätsmerkmale und Stationsfelder"/>
      </TabsContent>
    </Tabs>
  </>;
}

export default function OpenStationDetailsPanel({stada,sourceSha256}:{stada:string;sourceSha256?:string}) {
  const [state,setState]=useState<{key:string;data:OpenStationDetails|null;error:string;loading:boolean}>({key:stada,data:null,error:'',loading:true});
  const [attempt,setAttempt]=useState(0), path=openStationDetailsPath(stada);
  useEffect(()=>{
    const controller=new AbortController();
    if(!path){setState({key:stada,data:null,error:'Für diese Station ist keine gültige DB-Kennung verfügbar.',loading:false});return;}
    setState({key:stada,data:null,error:'',loading:true});
    staticFetch(path,{signal:controller.signal}).then(async response=>{if(!response.ok)throw new Error('Die zusätzlichen Stationsdaten konnten nicht geladen werden.');return response.json() as Promise<OpenStationDetails>;}).then(data=>{if(data.schemaVersion!=='openstation-details/1.0.0'||data.stada!==stada)throw new Error('Die Stationsdaten konnten nicht eindeutig zugeordnet werden.');setState({key:stada,data,error:'',loading:false});}).catch(error=>{if(!controller.signal.aborted)setState({key:stada,data:null,error:(error as Error).message,loading:false});});
    return ()=>controller.abort();
  },[stada,path,attempt]);
  const mismatch=!!(sourceSha256&&state.data&&sourceSha256!==state.data.provenance.sourceSha256);
  return <div className="openstation-data">{state.loading||state.key!==stada?<p role="status">Zusätzliche OpenStation-Daten werden geladen …</p>:state.error?<div className="os-status-line" role="alert"><p>{state.error}</p><Button variant="outline" size="sm" onClick={()=>setAttempt(value=>value+1)}><RefreshCw size={14}/>Erneut laden</Button></div>:mismatch?<p className="os-status-line" role="alert">Zusatzdaten und Stationsprofil stammen aus unterschiedlichen Infrastrukturdownloads. Die Zusatzdaten können diesem Profil deshalb nicht verlässlich zugeordnet werden.</p>:state.data&&path?<DetailsContent key={stada} data={state.data} path={path}/>:null}</div>;
}
