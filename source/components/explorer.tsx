import {StaticLink} from '../pages/static-link';
'use client';
import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {Map,LocateFixed,Database,Download,Search,Info,PanelTop,ArrowUpRight,ArrowRight,MapPin,AlertCircle,ChevronRight,RotateCcw,ChevronsLeft,ChevronsRight,ChevronLeft} from 'lucide-react';
import {SidebarProvider,Sidebar,SidebarHeader,SidebarContent,SidebarFooter,SidebarMenu,SidebarMenuItem,SidebarMenuButton,SidebarTrigger} from '@/components/ui/sidebar';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Tabs,TabsList,TabsTrigger,TabsContent} from '@/components/ui/tabs';
import {Table,TableBody,TableCell,TableHead,TableHeader,TableRow} from '@/components/ui/table';
import StartupLoading from './startup-loading';
import {loadStationCatalogue,type StartupProgress,type StationBootstrap} from '@/lib/startup';
import ResearchMap from './research-map';
import {StationIcon} from './station-icon';
import {overviewPositions} from '@/lib/map-context';
import {MapLegend} from './map-symbols';
import ProfileView from './profile-view';
import MethodologyView from './methodology-view';
import ExportView from './export-view';
import {Choice,request,format,date} from './research-controls';
import {catalogue} from '@/lib/catalogue';
import {censusContext,defaultWindow,type TimeWindow,type IntegratedContext} from '@/lib/integration';
import TimeControls from './time-controls';
import {loadResearchManifest,requestStationResearch,type ResearchManifestResult,type ResearchStationResult} from '@/lib/research-sources';
import type {Station,Profile,Enrichment} from '@/lib/types';
import {parseStationCategory,stationSize,stationSizeLabels,stationSizeDescription} from '@/lib/station-category';
import StationCategoryFilter from './station-category-filter';
import './station-selection.css';
const views=[['Bahnhofsauswahl',Map],['Stationsprofil',PanelTop],['Quellen & Methodik',Database],['Export',Download]] as const;
const PAGE_SIZE=10;
const defaults=catalogue.map(indicator=>indicator.id);
export default function Explorer(){
 const [boot,setBoot]=useState<StationBootstrap|null>(null),[bootError,setBootError]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const [entered,setEntered]=useState(false),[bootAttempt,setBootAttempt]=useState(0);
 const [startup,setStartup]=useState<StartupProgress>({value:8,message:'Stationskatalog wird angefordert …'});
 const workspaceRef=useRef<HTMLElement>(null);
 const [view,setView]=useState(0),[needle,setNeedle]=useState(''),[state,setState]=useState('all'),[coverage,setCoverage]=useState('all'),[scope,setScope]=useState('all'),[categories,setCategories]=useState<number[]>([]),[selectedId,setSelectedId]=useState(''),[radius,setRadius]=useState(500),[page,setPage]=useState(0),[stationTab,setStationTab]=useState('map');
 const [profiles,setProfiles]=useState<Record<string,Profile>>({}),[osmCache,setOsmCache]=useState<Record<string,Enrichment|null>>({}),[indicators,setIndicators]=useState(defaults);
 const [osmReads,setOsmReads]=useState<Record<string,'ready'|'error'>>({});
 const [timeWindow,setTimeWindow]=useState<TimeWindow>(defaultWindow),[contextRaw,setContextRaw]=useState<Record<string,any>>({}),[shared,setShared]=useState<any>(null);
 const [researchByStation,setResearchByStation]=useState<Record<string,ResearchStationResult>>({});
 const researchRequests=useRef(new globalThis.Map<string,Promise<ResearchStationResult>>());
 const [researchRetry,setResearchRetry]=useState(0);
 const [researchSupport,setResearchSupport]=useState<ResearchManifestResult|null>(null),[researchManifestRetry,setResearchManifestRetry]=useState(0);
 const retryResearch=useCallback(()=>{if(researchSupport?.error){setResearchManifestRetry(n=>n+1);return;}setResearchByStation(old=>{const next={...old};delete next[selectedId];return next;});setResearchRetry(n=>n+1);},[selectedId,researchSupport?.error]);
 const staticContext=useRef(new globalThis.Map<string,Promise<any>>());
 useEffect(()=>{Promise.all(['/data/integration/timetable/shared.json','/data/integration/geodata/dictionary.json','/data/integration/facility-history/manifest.json'].map(url=>request(url))).then(([timetable,dictionary,facilityHistory])=>setShared({timetable,dictionary,facilityHistory})).catch(e=>setError('Integrierte Quellen: '+e.message));},[]);
 useEffect(()=>{let live=true;setResearchSupport(null);void loadResearchManifest(request).then(result=>{if(live)setResearchSupport(result);});return()=>{live=false;};},[researchManifestRetry]);
 const snapshotPath=useRef<string|null>(null);snapshotPath.current=boot?.provenance.profile_path??null;
 const inflight=useRef(new globalThis.Map<string,Promise<Profile|null>>());const profileRef=useRef(profiles);profileRef.current=profiles;
 useEffect(()=>{
  const controller=new AbortController();let live=true,timedOut=false;
  setBootError('');setStartup({value:8,message:'Stationskatalog wird angefordert …'});
  const timeout=setTimeout(()=>{timedOut=true;controller.abort();},60000);
  void loadStationCatalogue(controller.signal,progress=>{if(live)setStartup(progress);}).then(d=>{
   if(!live)return;
   const startIndex=d.stations.findIndex(s=>s.id==='db:1040');
   setBoot(d);setSelectedId(startIndex>=0?'db:1040':d.stations[0].id);setPage(startIndex>=0?Math.floor(startIndex/PAGE_SIZE):0);
   setStartup({value:100,message:'Bereit zur Bahnhofsauswahl.'});
  }).catch(e=>{
   if(live)setBootError(timedOut?'Das Laden dauert zu lange. Bitte erneut versuchen.':e instanceof TypeError?'Stationsdaten sind momentan nicht erreichbar. Bitte erneut versuchen.':e.message);
  }).finally(()=>clearTimeout(timeout));
  return()=>{live=false;clearTimeout(timeout);controller.abort();};
 },[bootAttempt]);
 useEffect(()=>{if(entered)workspaceRef.current?.focus({preventScroll:true});},[entered]);
 const stations:Station[]=boot?.stations??[];
 const selected=stations.find(s=>s.id===selectedId)??null,profile=profiles[selectedId],osm=osmCache[selectedId+':'+radius];
 const loadProfile=useCallback(async(id:string)=>{if(profileRef.current[id])return profileRef.current[id];if(inflight.current.has(id))return inflight.current.get(id)!;
 const promise=request((snapshotPath.current??'/data/profiles')+'/'+id.replace('db:','')+'.json').then(p=>{setProfiles(old=>({...old,[id]:p}));return p;}).catch(e=>{setError(e.message);return null;}).finally(()=>inflight.current.delete(id));inflight.current.set(id,promise);return promise;},[]);
 useEffect(()=>{if(selectedId)void loadProfile(selectedId);},[selectedId,loadProfile]);
 useEffect(()=>{let live=true;if(selectedId)request('/api/research?action=osm&station='+encodeURIComponent(selectedId)+'&radius='+radius).then(d=>{if(live){setOsmCache(old=>({...old,[selectedId+':'+radius]:d}));setOsmReads(old=>({...old,[selectedId+':'+radius]:'ready'}));}}).catch(()=>{if(live)setOsmReads(old=>({...old,[selectedId+':'+radius]:'error'}));});return()=>{live=false};},[selectedId,radius]);

 useEffect(()=>{
  const manifest=researchSupport?.manifest;if(!selectedId||!manifest)return;
  const pending=requestStationResearch(researchRequests.current,manifest,selectedId,request);
  let live=true;pending.then(data=>{if(live)setResearchByStation(old=>({...old,[selectedId]:data}));});return()=>{live=false};
 },[selectedId,researchSupport?.manifest,researchRetry]);
 const contextIds=selectedId;
 useEffect(()=>{let live=true;if(!boot)return;const ids=contextIds.split(',').filter(Boolean);void(async()=>{for(let offset=0;offset<ids.length;offset+=4)await Promise.all(ids.slice(offset,offset+4).map(async id=>{
  const station=stations.find(s=>s.id===id)!;if(!station)return;
  if(!staticContext.current.has(id))staticContext.current.set(id,(async()=>{const errors:string[]=[];const read=async(name:string,url:string)=>{try{return await request(url);}catch(e){errors.push(name+': '+(e as Error).message);return null;}};const [timetable,infrastructure,geodata]=await Promise.all([read('Fahrplan','/data/integration/timetable/stations/'+station.stada+'.json'),read('Ausstattung','/data/integration/infrastructure/stations/'+station.stada+'.json'),station.map_anchor?read('Geodaten','/data/integration/geodata/stations/'+station.stada+'.json'):null]);return {timetable,infrastructure,geodata:censusContext(geodata),errors};})());
  const fixed=await staticContext.current.get(id);if(live)setContextRaw(old=>({...old,[id]:{...fixed,weather:null,window:timeWindow,ready:!station.map_anchor}}));let weather=null;const errors=[...fixed.errors];
  if(station.map_anchor)try{weather=await request('/api/weather?'+new URLSearchParams({station:id,date:timeWindow.date,start:timeWindow.start,end:timeWindow.end}));}catch(e){errors.push('Wetter: '+(e as Error).message);}
  if(live)setContextRaw(old=>({...old,[id]:{...fixed,weather,errors,window:timeWindow,ready:true}}));
 }));})();return()=>{live=false;};},[contextIds,timeWindow.date,timeWindow.start,timeWindow.end,boot]);
 const contexts=useMemo(()=>Object.fromEntries(Object.entries(contextRaw).map(([id,c])=>[id,{...c,window:timeWindow,weather:c.window.date===timeWindow.date&&c.window.start===timeWindow.start&&c.window.end===timeWindow.end?c.weather:undefined,ready:!!c.ready&&c.window.date===timeWindow.date&&c.window.start===timeWindow.start&&c.window.end===timeWindow.end&&!!shared&&(!!researchSupport?.error||!!researchByStation[id]),researchManifest:researchSupport?.manifest,research:researchByStation[id]?.sources,researchReady:!!researchSupport?.error||!!researchByStation[id],researchErrors:[...(researchSupport?.error?[researchSupport.error]:[]),...(researchByStation[id]?.errors??[])],shared:shared?.timetable,dictionary:shared?.dictionary,facilityHistory:shared?.facilityHistory}])) as Record<string,IntegratedContext>,[contextRaw,timeWindow,shared,researchByStation,researchSupport]);
 useEffect(()=>setPage(0),[needle,state,coverage,scope,categories]);
 const filtered=useMemo(()=>stations.filter(s=>(!categories.length||categories.includes(parseStationCategory(s.station_category)??0))&&(scope==='examples'?boot?.examples.includes(s.id):true)&&(state==='all'||s.state===state)&&(coverage==='all'||coverage==='mapped'&&overviewPositions(s).length>0||coverage==='anchor'&&!!s.map_anchor||coverage==='entrances'&&s.entrance_count!==null)&&(!needle||(s.name+' '+s.city+' '+s.stada+' '+s.eva_ids.join(' ')+' '+(s.ril??'')).toLocaleLowerCase('de').includes(needle.toLocaleLowerCase('de')))),[stations,boot,needle,state,coverage,scope,categories]);
 useEffect(()=>setPage(p=>Math.min(p,Math.max(0,Math.ceil(filtered.length/PAGE_SIZE)-1))),[filtered.length]);
 function resetFilters(){setNeedle('');setState('all');setCoverage('all');setScope('all');setCategories([]);setPage(0);}
 async function enrich(){if(!selected)return;setError('');setBusy(true);try{const r=await request('/api/research',{action:'enrich',station_id:selected.id,radius});setOsmCache(old=>({...old,[selected.id+':'+radius]:r.data}));setOsmReads(old=>({...old,[selected.id+':'+radius]:'ready'}));}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 function openProfile(id:string){setSelectedId(id);setView(1);}
 useEffect(()=>{const ctx=(document as any).modelContext;if(!ctx?.registerTool||!stations.length)return;const controller=new AbortController();Promise.resolve(ctx.registerTool({name:'search_stations',title:'Bahnhöfe suchen',description:'Search the imported real station catalogue; read-only, no upstream request.',inputSchema:{type:'object',properties:{query:{type:'string',maxLength:100}},required:['query'],additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:true},execute(input:unknown){const q=input as any;if(!q||typeof q.query!=='string'||q.query.length>100||Object.keys(q).some(k=>k!=='query'))throw Error('Invalid query');return stations.filter(s=>s.name.toLowerCase().includes(q.query.toLowerCase())).slice(0,20).map(s=>({id:s.id,name:s.name,state:s.state}));}},{signal:controller.signal})).catch(()=>{});return()=>controller.abort();},[stations]);
 if(!entered||!boot)return <StartupLoading progress={startup.value} message={startup.message} ready={!!boot} error={bootError} onRetry={()=>setBootAttempt(attempt=>attempt+1)} onEnter={()=>{if(boot){setView(0);setEntered(true);}}}/>;
 const stateItems:[string,string][]=[['all','Alle Bundesländer'],...[...new Set(stations.map(s=>s.state))].sort().map(x=>[x,x] as [string,string])];
 const currentPage=Math.min(page,Math.max(0,Math.ceil(filtered.length/PAGE_SIZE)-1));
 const pageStations=filtered.slice(currentPage*PAGE_SIZE,(currentPage+1)*PAGE_SIZE),mapSelected=filtered.find(s=>s.id===selectedId)??null;
 const lastPage=Math.max(0,Math.ceil(filtered.length/PAGE_SIZE)-1);
 const pagination=<nav className="list-footer" aria-label="Stationsseiten"><div><button aria-label="Erste Seite" title="Erste Seite" disabled={currentPage===0} onClick={()=>setPage(0)}><ChevronsLeft size={15}/></button><button aria-label="Vorherige Seite" title="Vorherige Seite" disabled={currentPage===0} onClick={()=>setPage(currentPage-1)}><ChevronLeft size={15}/></button></div><span>{format(filtered.length?currentPage*PAGE_SIZE+1:0)}–{format(Math.min((currentPage+1)*PAGE_SIZE,filtered.length))} von {format(filtered.length)}</span><div><button aria-label="Nächste Seite" title="Nächste Seite" disabled={currentPage>=lastPage} onClick={()=>setPage(currentPage+1)}><ChevronRight size={15}/></button><button aria-label="Letzte Seite" title="Letzte Seite" disabled={currentPage>=lastPage} onClick={()=>setPage(lastPage)}><ChevronsRight size={15}/></button></div></nav>;
 return <SidebarProvider><Sidebar><SidebarHeader><StaticLink className="brand" href="/"><span className="brand-icon"><StationIcon size={24}/></span><span>Safespace<span className="brand-second">Bahnhof</span></span></StaticLink><p className="sidebar-caption">STATIONSKONTEXT-EXPLORER</p></SidebarHeader><SidebarContent><SidebarMenu>{views.map(([name,Icon],i)=><SidebarMenuItem key={name}><SidebarMenuButton isActive={view===i} onClick={()=>setView(i)}><Icon/><span>{name}</span></SidebarMenuButton></SidebarMenuItem>)}</SidebarMenu></SidebarContent><SidebarFooter><p className="version">VERSION 1.0</p></SidebarFooter></Sidebar>
 <main ref={workspaceRef} tabIndex={-1} className={'workspace '+['overview-workspace','profile-workspace','methodology-workspace','export-workspace'][view]}>
 <div className="page-content"><div className="page-heading"><div className="page-title"><SidebarTrigger aria-label="Navigation einblenden"/><div><p className="eyebrow">{['RÄUMLICHE KONTEXTANALYSE','DOKUMENTIERTE STATIONSMERKMALE','QUELLEN & REPRODUZIERBARKEIT','DATEN FÜR DIE WEITERE ANALYSE'][view]}</p><h1>{view===0?'Bahnhöfe im Kontext':views[view][0]}</h1><p>{['Infrastruktur und Umfeld erkunden. Daten nachvollziehen.','Jeder Wert mit Definition, Raumbezug und Quelle.','Geprüfte Zugangswege, dokumentierte Methoden und klare Grenzen.','Daten der ausgewählten Station mit Quellen weiterverwenden.'][view]}</p></div></div>{view!==3&&<Button variant="outline" onClick={()=>setView(3)}><Download size={16}/>Daten exportieren</Button>}</div>
 {error&&<div role="alert" className="inline-feedback"><AlertCircle size={18}/>{error}<button aria-label="Fehlermeldung schließen" onClick={()=>setError('')}>×</button></div>}
 {view===0&&<><div className="stats-row"><div><span className="stat-label">Stationen</span><strong>{format(stations.length)}</strong></div><div><span className="stat-label">Bundesländer</span><strong>16<MapPin size={17}/></strong></div><div><span className="stat-label">Mit Kartenposition</span><strong>{format(stations.filter(s=>overviewPositions(s).length>0).length)}<Map size={17}/></strong></div><div><span className="stat-label" title="Mit dokumentiertem Bezugspunkt für die Berechnung von Umfeldmerkmalen">Mit Analysepunkt</span><strong>{format(stations.filter(s=>!!s.map_anchor).length)}<LocateFixed size={17}/></strong></div></div>
 <Tabs className="station-workspace" value={stationTab} onValueChange={setStationTab}><div className="section-bar"><div><h2>Bahnhofsauswahl</h2><span className="muted">{format(filtered.length)} Treffer</span></div><TabsList><TabsTrigger value="map"><Map size={14}/>Karte</TabsTrigger><TabsTrigger value="table"><PanelTop size={14}/>Tabelle</TabsTrigger></TabsList></div>
 <div className="filter-bar"><div className="search-wrap"><Search size={16}/><Input aria-label="Bahnhof suchen" placeholder="Bahnhof, Ort oder Stations-ID filtern …" value={needle} onChange={e=>setNeedle(e.target.value)}/></div><Choice label="Bundesland" value={state} onChange={setState} items={stateItems}/><StationCategoryFilter categories={categories} onChange={setCategories}/><Choice label="Datenabdeckung" value={coverage} onChange={setCoverage} items={[['all','Alle Datenabdeckungen'],['mapped','Mit Kartenposition'],['anchor','Mit Analyseanker'],['entrances','Mit dokumentierten Zugängen']]}/><Choice label="Stationsauswahl" value={scope} onChange={setScope} items={[['all','Alle Stationen ('+format(stations.length)+')'],['examples','Beispielstationen ('+format(boot.examples.length)+')']]}/><Button variant="outline" size="icon" aria-label="Filter zurücksetzen" title="Filter zurücksetzen" disabled={!needle&&state==='all'&&coverage==='all'&&scope==='all'&&!categories.length} onClick={resetFilters}><RotateCcw size={15}/></Button></div>
 {scope==='examples'&&<p className="example-note"><Info size={13}/><span>{boot.examples.length} reale Beispiele; keine bestätigten Studienstandorte. <button className="text-link" onClick={()=>setScope('all')}>Gesamte Datenbasis durchsuchen</button></span></p>}
 <TabsContent value="map" className="station-map-tab"><div className="explorer-grid"><section className="panel station-list-panel"><div className="panel-title"><h3>Stationen</h3><span className="muted small">10 pro Seite</span></div><div className="station-list">{pageStations.map(s=><div className={'station-row '+(selectedId===s.id?'selected':'')} key={s.id}><button className="station-row-main" title={s.name+' · '+s.state+' · '+stationSizeDescription(s.station_category)} onClick={()=>setSelectedId(s.id)}><strong>{s.name}</strong><small>{stationSizeLabels[stationSize(s.station_category)]} · {s.state}</small></button>{overviewPositions(s).length>0?<MapPin size={12} aria-label="Mit Kartenposition"/>:<span className="no-map-point" title="Position unbekannt" aria-label="Position unbekannt">—</span>}</div>)}{!filtered.length&&<div className="empty-state"><Search size={22}/><h3>Keine Stationen gefunden</h3><p>Suchbegriff oder Filter anpassen.</p><Button variant="outline" onClick={resetFilters}>Filter zurücksetzen</Button></div>}</div>{pagination}</section>
 <section className="panel overview-map"><ResearchMap stations={filtered} selected={mapSelected} radius={radius} layers={[]} onSelect={id=>{setSelectedId(id);const index=filtered.findIndex(s=>s.id===id);if(index>=0)setPage(Math.floor(index/PAGE_SIZE));}}/></section>
 <aside className="panel overview-legend"><MapLegend/><div className="coverage-note"><strong>{format(filtered.filter(s=>overviewPositions(s).length>0).length)} von {format(filtered.length)}</strong><span>Treffern auf der Karte</span></div>
 {mapSelected?<div className="map-profile-preview"><span className="overline">AUSGEWÄHLTE STATION</span><h3>{mapSelected.name}</h3><p>{mapSelected.state}<br/>StaDa {mapSelected.stada}<br/>{stationSizeDescription(mapSelected.station_category)}</p><div className="preview-metrics"><span><strong>{mapSelected.platform_count}</strong>Bahnsteige</span><span><strong>{format(mapSelected.entrance_count)}</strong>Zugänge</span></div><Button size="sm" onClick={()=>setView(1)}>Stationsprofil <ArrowRight size={14}/></Button></div>:<p className="legend-caption">Wählen Sie eine Station aus der Liste oder auf der Karte.</p>}
 </aside></div></TabsContent>
 <TabsContent value="table" className="station-table-tab"><section className="panel station-table-panel"><div className="station-table-scroll"><Table><TableHeader><TableRow><TableHead>Bahnhof</TableHead><TableHead>Bundesland</TableHead><TableHead>Größe</TableHead><TableHead>StaDa / EVA</TableHead><TableHead>Bahnsteige</TableHead><TableHead>Position</TableHead></TableRow></TableHeader><TableBody>{pageStations.map(s=><TableRow key={s.id}><TableCell><button className="table-link" onClick={()=>openProfile(s.id)}>{s.name}</button></TableCell><TableCell>{s.state}</TableCell><TableCell>{stationSizeDescription(s.station_category)}</TableCell><TableCell>{s.stada} / {s.eva_ids.join(', ')}</TableCell><TableCell>{s.platform_count}</TableCell><TableCell>{overviewPositions(s).length>0?'Kartenposition vorhanden':'Position unbekannt'}</TableCell></TableRow>)}{!pageStations.length&&<TableRow><TableCell colSpan={6}>Keine Stationen gefunden. Passen Sie die Filter an.</TableCell></TableRow>}</TableBody></Table></div>{pagination}</section></TabsContent></Tabs>
 <div className="bottom-note"><Database size={13}/><span>OpenStation · Stand {date(boot.provenance.publication_time)}</span><button className="text-link" onClick={()=>setView(2)}>Quellen & Methodik <ArrowUpRight size={13}/></button></div></>}

 {view===1&&selected&&<ProfileView onRetryResearch={retryResearch} context={contexts[selectedId]} timeWindow={timeWindow} setTimeWindow={setTimeWindow} locationSources={boot.location_sources} station={selected} profile={profile} osm={osm} sourceUnavailable={osmReads[selectedId+':'+radius]==='error'} radius={radius} setRadius={setRadius} indicators={indicators} setIndicators={setIndicators} busy={busy} onEnrich={enrich}/>}
 {view===2&&<MethodologyView sources={boot.sources} provenance={boot.provenance} researchManifest={researchSupport?.manifest} researchLoading={!researchSupport} researchErrors={researchSupport?.error?[researchSupport.error]:[]} onRetryResearch={retryResearch}/>}
 {view===3&&<><TimeControls value={timeWindow} onChange={setTimeWindow}/><ExportView onRetryResearch={retryResearch} contexts={contexts} locationSources={boot.location_sources} stations={selected?[selected]:[]} profiles={profiles} osm={osmCache} osmReads={osmReads} radius={radius} indicators={indicators} setIndicators={setIndicators} onChoose={()=>setView(0)}/></>}
 <footer className="app-footer"><span>Safespace Bahnhof</span><span>Nachvollziehbare Merkmale. Keine Sicherheitsbewertung.</span></footer></div></main></SidebarProvider>;
}
