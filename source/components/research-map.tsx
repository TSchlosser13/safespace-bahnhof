import {staticFetch} from '../pages/static-fetch';
import {StaticLink} from '../pages/static-link';
'use client';
import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {Plus,Minus,Expand,LocateFixed,Globe2} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {bufferGeometry} from '@/lib/geo';
import {compatibleSnapshot,displayLocations,overviewPositions,worldPosition,zoomAt,MAP_WIDTH as W,MAP_HEIGHT as H,type Position,type Viewport} from '@/lib/map-context';
import {clusterMapPoints,type MapCluster} from '@/lib/map-clusters';
import {MarkerGlyph,symbolColor,type SymbolKind} from './map-symbols';
import type {Station,Profile,Enrichment,Feature} from '@/lib/types';
type Props={stations:Station[];selected:Station|null;profile?:Profile|null;osm?:Enrichment|null;radius:number;detail?:boolean;layers:string[];onSelect:(id:string)=>void};
const initialView:Viewport={zoom:1,pan:[0,0]};
const overviewLimits={min:1/512,max:128};
const stationLabel={x:22,y:-24,height:20,padding:6};
const tilesUrl='https://tile.openstreetmap.org/{z}/{x}/{y}.png';
function mercator(p:number[]){const x=(p[0]-5.2)/10.8*W;const m=(lat:number)=>Math.log(Math.tan(Math.PI/4+lat*Math.PI/360));return [x,(m(55.5)-m(p[1]))/(m(55.5)-m(46.7))*H];}
function linePath(coords:number[][],project:(p:number[])=>number[]){return coords.map((c,i)=>{const [x,y]=project(c);return (i?'L':'M')+x.toFixed(2)+','+y.toFixed(2)}).join(' ');}
function shapePath(g:any,project:(p:number[])=>number[]):string{
 if(g.type==='Polygon')return g.coordinates.map((r:number[][])=>linePath(r,project)+'Z').join(' ');
 if(g.type==='MultiPolygon')return g.coordinates.map((p:number[][][])=>p.map(r=>linePath(r,project)+'Z').join(' ')).join(' ');
 if(g.type==='LineString')return linePath(g.coordinates,project);
 if(g.type==='MultiLineString')return g.coordinates.map((r:number[][])=>linePath(r,project)).join(' ');
 return '';
}
function featureLayer(f:Feature):SymbolKind|null{
 const t=f.properties;if(t.railway==='platform')return 'platforms';
 if(t.entrance&&t.entrance!=='no')return 'entrances';
 if(t.highway==='street_lamp'||t.man_made==='street_lamp')return 'lights';
 if(['footway','path','steps','pedestrian'].includes(t.highway))return 'footways';
 if(t.shop&&t.shop!=='no'||['bench','bicycle_parking','restaurant','cafe','fast_food','toilets','shelter'].includes(t.amenity))return 'amenities';
 return null;
}
export default function ResearchMap({stations,selected,profile,osm,radius,detail=false,layers,onSelect}:Props){
 const [geography,setGeography]=useState<any>(null),[viewport,setViewport]=useState<Viewport>(initialView);
 const [dimensions,setDimensions]=useState({width:W,height:H}),[failedTiles,setFailedTiles]=useState<Set<string>>(()=>new Set());
 const svg=useRef<SVGSVGElement>(null),surface=useRef<HTMLDivElement>(null);
 const drag=useRef<{pointer:number;point:Position;pan:Position}|null>(null);
 const {zoom,pan}=viewport,focusId=selected?.id;
 const screenScale=Math.max(dimensions.width/W,dimensions.height/H)||1;
 const visibleWidth=dimensions.width/screenScale,visibleHeight=dimensions.height/screenScale;
 useEffect(()=>{staticFetch('/data/germany.geojson').then(r=>r.json()).then(setGeography).catch(()=>{});},[]);
 useEffect(()=>{setViewport(initialView);drag.current=null;setFailedTiles(new Set());},[focusId,detail,radius]);
 useEffect(()=>{const el=svg.current;if(!el)return;const observer=new ResizeObserver(([entry])=>setDimensions({width:entry.contentRect.width,height:entry.contentRect.height}));observer.observe(el);return()=>observer.disconnect();},[]);
 const pointerPoint=useCallback((clientX:number,clientY:number):Position=>{
  const matrix=svg.current?.getScreenCTM();if(!matrix)return [W/2,H/2];
  const p=new DOMPoint(clientX,clientY).matrixTransform(matrix.inverse());return [p.x,p.y];
 },[]);
 useEffect(()=>{
  const el=surface.current;if(!el)return;
  const wheel=(e:WheelEvent)=>{e.preventDefault();drag.current=null;
   const delta=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?dimensions.height:1);
   const point=pointerPoint(e.clientX,e.clientY);
   setViewport(v=>zoomAt(v,point,Math.exp(-Math.max(-500,Math.min(500,delta))*.002),detail?undefined:overviewLimits));
  };
  el.addEventListener('wheel',wheel,{passive:false});return()=>el.removeEventListener('wheel',wheel);
 },[pointerPoint,dimensions.height,detail]);
 const locations=useMemo(()=>selected?displayLocations(selected):[],[selected]);
 const origin=selected?.map_anchor;
 // Cartographic candidates set the viewport only. Analysis continues to use the immutable source anchor.
 const mapContext=useMemo(()=>{
  if(!detail){
   const points=selected?overviewPositions(selected):[],worlds=points.map(worldPosition);
   const center:Position=worlds.length?[(Math.min(...worlds.map(p=>p[0]))+Math.max(...worlds.map(p=>p[0])))/2,(Math.min(...worlds.map(p=>p[1]))+Math.max(...worlds.map(p=>p[1])))/2]:worldPosition([10.45,51.16]);
   let scale=256*2**12/screenScale;
   if(!points.length){const a=worldPosition([5.7,55.1]),b=worldPosition([15.1,47.2]);scale=Math.min(visibleWidth*.86/(b[0]-a[0]),visibleHeight*.86/(b[1]-a[1]));}
   return {center,scale};
  }
  const points:Position[]=[...(origin?[origin]:[]),...locations.map(l=>l.coordinates)];
  if(!points.length)return null;
  const worlds=points.map(worldPosition),xs=worlds.map(p=>p[0]),ys=worlds.map(p=>p[1]);
  const center:Position=origin?worldPosition(origin):[(Math.min(...xs)+Math.max(...xs))/2,(Math.min(...ys)+Math.max(...ys))/2];
  const lat=origin?.[1]??Math.atan(Math.sinh(Math.PI*(1-2*center[1])))*180/Math.PI;
  let scale=220/radius*2*Math.PI*6371008.8*Math.cos(lat*Math.PI/180);
  // Keep all published candidates in view, including ambiguous matches; do not pick a fabricated station point.
  const dx=Math.max(...xs.map(x=>Math.abs(x-center[0]))),dy=Math.max(...ys.map(y=>Math.abs(y-center[1])));


  if(dx)scale=Math.min(scale,(visibleWidth*.4)/dx);
  if(dy)scale=Math.min(scale,(visibleHeight*.4)/dy);
  return {center,scale};
 },[detail,origin,locations,radius,dimensions,selected,screenScale,visibleWidth,visibleHeight]);
 const project=(p:number[])=>mapContext?(()=>{const w=worldPosition(p as Position);return [W/2+(w[0]-mapContext.center[0])*mapContext.scale,H/2+(w[1]-mapContext.center[1])*mapContext.scale]})():mercator(p);
 const shown=useMemo(()=>detail?[]:stations.flatMap(s=>overviewPositions(s).map((position,i)=>{
  const base=project(position),point:Position=[(base[0]-W/2)*zoom*screenScale+pan[0]*screenScale+dimensions.width/2,(base[1]-H/2)*zoom*screenScale+pan[1]*screenScale+dimensions.height/2];
  return {station:s,position,point,base,key:s.id+':'+i};
 })).filter(p=>p.point[0]>-20&&p.point[0]<dimensions.width+20&&p.point[1]>-20&&p.point[1]<dimensions.height+20),[stations,detail,mapContext,zoom,pan,screenScale,dimensions]);
 const clusters=useMemo(()=>clusterMapPoints(shown.filter(p=>p.station.id!==selected?.id).map(p=>({key:p.key,stationId:p.station.id,point:p.point})),40),[shown,selected?.id]);
 const groups=clusters.filter(c=>c.count>1),singleKeys=new Set(clusters.filter(c=>c.count===1).flatMap(c=>c.members.map(m=>m.key)));
 const singleStations=shown.filter(p=>p.station.id===selected?.id||singleKeys.has(p.key)).sort((a,b)=>Number(a.station.id===selected?.id)-Number(b.station.id===selected?.id));
 const fromScreen=(p:Position):Position=>[W/2+(p[0]-dimensions.width/2)/screenScale,H/2+(p[1]-dimensions.height/2)/screenScale];
 const baseFromScreen=(p:Position):Position=>[W/2+((p[0]-dimensions.width/2)/screenScale-pan[0])/zoom,H/2+((p[1]-dimensions.height/2)/screenScale-pan[1])/zoom];
 function expandCluster(cluster:MapCluster){
  const point=fromScreen(cluster.point),base=baseFromScreen(cluster.point);
  const xs=cluster.members.map(p=>p.point[0]),ys=cluster.members.map(p=>p.point[1]);
  const factor=Math.max(2,Math.min(6,dimensions.width*.65/Math.max(1,Math.max(...xs)-Math.min(...xs)),dimensions.height*.65/Math.max(1,Math.max(...ys)-Math.min(...ys))));
  const next=zoomAt(viewport,point,factor,overviewLimits);
  setViewport({...next,pan:[-(base[0]-W/2)*next.zoom,-(base[1]-H/2)*next.zoom]});
 }
 function showGermany(){
  if(!mapContext)return;
  const a=project([5.7,55.1]),b=project([15.1,47.2]);
  const nextZoom=Math.min(visibleWidth*.88/(b[0]-a[0]),visibleHeight*.88/(b[1]-a[1]));
  setViewport({zoom:nextZoom,pan:[-((a[0]+b[0])/2-W/2)*nextZoom,-((a[1]+b[1])/2-H/2)*nextZoom]});
  drag.current=null;
 }
 const mapLevel=mapContext?Math.log2(mapContext.scale*screenScale*zoom/256):0;
 const labelKeys=new Set<string>(),labelBoxes:number[][]=[];
 for(const p of [...singleStations].reverse()){
  const active=p.station.id===selected?.id;if(!active&&mapLevel<11.5)continue;
  const width=Math.min(192,p.station.name.length*6.7+12),box=[p.point[0]+stationLabel.x,p.point[1]+stationLabel.y,p.point[0]+stationLabel.x+width,p.point[1]+stationLabel.y+stationLabel.height];
  if(active||box[2]<dimensions.width-8&&box[1]>8&&!labelBoxes.some(b=>box[0]<b[2]+8&&box[2]>b[0]-8&&box[1]<b[3]+8&&box[3]>b[1]-8)){labelKeys.add(p.key);labelBoxes.push(box);}
 }
 const metresPerPixel=mapContext?40075016.686*Math.cos(Math.atan(Math.sinh(Math.PI*(1-2*(mapContext.center[1]-pan[1]/(mapContext.scale*zoom))))))/(mapContext.scale*zoom*screenScale):0;
 const scalePower=10**Math.floor(Math.log10(metresPerPixel*80||1));
 const scaleMetres=[5,2,1].map(n=>n*scalePower).find(n=>n<=metresPerPixel*100)??scalePower;
 const snapshotMatches=compatibleSnapshot(selected,radius,osm);
 const features=useMemo(()=>snapshotMatches?osm?.features.filter(f=>{const layer=featureLayer(f);return layer!==null&&layers.includes(layer);})??[]:[],[osm,layers,snapshotMatches]);
 const tiles=useMemo(()=>{
  if(!mapContext)return [];
  const {center,scale}=mapContext;

  const tileZoom=Math.max(0,Math.min(19,Math.round(Math.log2(scale*screenScale*zoom/256))));
  const count=2**tileZoom,size=scale/count;

  const left=W/2+(-visibleWidth/2-pan[0])/zoom,top=H/2+(-visibleHeight/2-pan[1])/zoom;
  const right=left+visibleWidth/zoom,bottom=top+visibleHeight/zoom;
  const xMin=Math.max(0,Math.floor((center[0]+(left-W/2)/scale)*count)),xMax=Math.min(count-1,Math.floor((center[0]+(right-W/2)/scale)*count));
  const yMin=Math.max(0,Math.floor((center[1]+(top-H/2)/scale)*count)),yMax=Math.min(count-1,Math.floor((center[1]+(bottom-H/2)/scale)*count));
  const out:{url:string;x:number;y:number;size:number}[]=[];
  for(let x=xMin;x<=xMax;x++)for(let y=yMin;y<=yMax;y++)out.push({url:tilesUrl.replace('{z}',String(tileZoom)).replace('{x}',String(x)).replace('{y}',String(y)),x:W/2+(x/count-center[0])*scale,y:H/2+(y/count-center[1])*scale,size});
  return out;
 },[mapContext,dimensions,zoom,pan]);
 const tileFailed=tiles.some(t=>failedTiles.has(t.url));
 const reset=()=>{setViewport(initialView);drag.current=null;};
 return <div ref={surface} className="map-surface" data-map-zoom={zoom} data-map-located={!!mapContext}>
 {!detail&&<div className="map-label">BAHNHÖFE · {selected?.name??'DEUTSCHLAND'}</div>}
 <div className="map-controls"><Button variant="outline" size="icon" aria-label="Karte vergrößern" onClick={()=>setViewport(v=>zoomAt(v,[W/2,H/2],1.5,detail?undefined:overviewLimits))}><Plus size={16}/></Button><Button variant="outline" size="icon" aria-label="Karte verkleinern" onClick={()=>setViewport(v=>zoomAt(v,[W/2,H/2],1/1.5,detail?undefined:overviewLimits))}><Minus size={16}/></Button><Button variant="outline" size="icon" aria-label="Kartenansicht zurücksetzen" onClick={reset}>{detail?<Expand size={15}/>:<LocateFixed size={15}/>}</Button>{!detail&&<Button variant="outline" size="icon" aria-label="Deutschland anzeigen" title="Deutschland anzeigen" onClick={showGermany}><Globe2 size={16}/></Button>}</div>
 <svg ref={svg} viewBox={'0 0 '+W+' '+H} preserveAspectRatio="xMidYMid slice" role="img" tabIndex={0} aria-label={detail?'Stationskarte: mit Mausrad zoomen, mit Ziehen verschieben':'Übersichtskarte: Bahnhof auswählen, Stationsgruppen zum Vergrößern anklicken, mit Mausrad zoomen'} className="research-map"
 onKeyDown={e=>{if(e.target!==e.currentTarget)return;if(e.key==='+'||e.key==='='||e.key==='-'){e.preventDefault();setViewport(v=>zoomAt(v,[W/2,H/2],e.key==='-'?1/1.5:1.5,detail?undefined:overviewLimits));}if(e.key==='0'){e.preventDefault();reset();}}}
 onPointerDown={e=>{if(e.button!==0||(e.target as Element).closest('[role=button]'))return;drag.current={pointer:e.pointerId,point:pointerPoint(e.clientX,e.clientY),pan};e.currentTarget.setPointerCapture(e.pointerId);}}
 onPointerMove={e=>{const d=drag.current;if(!d||d.pointer!==e.pointerId)return;const p=pointerPoint(e.clientX,e.clientY);setViewport(v=>({...v,pan:[d.pan[0]+p[0]-d.point[0],d.pan[1]+p[1]-d.point[1]]}));}}
 onPointerUp={e=>{drag.current=null;if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);}}
 onPointerCancel={()=>{drag.current=null;}} onLostPointerCapture={()=>{drag.current=null;}}>
 <defs><pattern id={detail?'detail-grid':'overview-grid'} width="38" height="38" patternUnits="userSpaceOnUse"><path d="M 38 0 L 0 0 0 38" fill="none" stroke="#e0e2e5" strokeWidth=".6"/></pattern></defs>
 <rect width={W} height={H} fill="#f1f2f3"/><rect width={W} height={H} fill={'url(#'+(detail?'detail-grid':'overview-grid')+')'}/>
 <g className="map-pan-layer" transform={'translate('+pan.join(',')+') translate('+W/2+','+H/2+') scale('+zoom+') translate('+(-W/2)+','+(-H/2)+')'}>
 {geography?.features.map((f:any)=><path key={f.id??f.properties.ags} d={shapePath(f.geometry,project)} fill="#f7f8f5" stroke="#c8cbd0" strokeWidth="1" vectorEffect="non-scaling-stroke"><title>{f.properties.gen}</title></path>)}
 {tiles.map(t=><image key={t.url} className="map-tile" href={t.url} x={t.x} y={t.y} width={t.size+.02} height={t.size+.02} onError={()=>setFailedTiles(old=>{const next=new Set(old);next.add(t.url);return next;})} onLoad={()=>setFailedTiles(old=>{if(!old.has(t.url))return old;const next=new Set(old);next.delete(t.url);return next;})}/>)}
 {detail&&origin&&<path d={shapePath(bufferGeometry(origin,radius),project)} fill="#ec001608" stroke="#ec0016" strokeDasharray="6 5" strokeWidth="1.3" vectorEffect="non-scaling-stroke"><title>{radius.toLocaleString('de-DE')} m · analytischer Puffer</title></path>}
 {detail&&features.map(f=>{const layer=featureLayer(f);if(!layer)return null;const color=symbolColor(layer),title=f.id+' · '+(f.properties.name??layer);
 if(f.geometry.type==='Point'){const [x,y]=project(f.geometry.coordinates);return <g key={f.id} data-map-layer={layer} transform={'translate('+x+','+y+') scale('+(1/Math.sqrt(zoom))+')'}><MarkerGlyph kind={layer} size={3.5}/><title>{title}</title></g>;}
 return <path key={f.id} data-map-layer={layer} d={shapePath(f.geometry,project)} fill={['Polygon','MultiPolygon'].includes(f.geometry.type)?color+'20':'none'} fillRule="evenodd" stroke={color} strokeWidth={layer==='footways'?1.7:1.3} strokeDasharray={layer==='footways'?'4 2':undefined} vectorEffect="non-scaling-stroke"><title>{title}</title></path>;})}
 {detail&&layers.includes('equipment')&&profile?.station.id===selected?.id&&profile?.equipment_places.filter(e=>e.coordinates).map(e=>{const [x,y]=project(e.coordinates);return <g key={e.id} data-map-layer="equipment" transform={'translate('+x+','+y+') scale('+(1/Math.sqrt(zoom))+')'}><MarkerGlyph kind="equipment" size={3.2}/><title>{e.id}</title></g>;})}
 {!detail&&groups.map(cluster=>{const point=baseFromScreen(cluster.point);return <g key={cluster.id} data-map-cluster data-cluster-count={cluster.count} className="map-cluster" role="button" tabIndex={0} aria-label={cluster.count+' Stationen – vergrößern'} transform={'translate('+point.join(',')+') scale('+(1/(zoom*screenScale))+')'} onClick={()=>expandCluster(cluster)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();expandCluster(cluster);}}}><circle r={19} fill="#fff" opacity=".8"/><circle className="cluster-disc" r={15} fill="#fff" stroke="#3c414b" strokeWidth="2"/><text textAnchor="middle" dy=".35em" fontFamily="Segoe UI,Arial,sans-serif" fontSize={cluster.count>99?11:12} fontWeight="700" fill="#282d37">{cluster.count}</text><title>{cluster.count+' Stationen · zum Vergrößern anklicken'}</title></g>;})}
 {singleStations.map(({station:s,base,key})=>{const active=s.id===selected?.id;return <g key={key} data-map-station-id={s.id} role="button" tabIndex={0} aria-label={s.name+' auswählen'} aria-pressed={active} onClick={()=>onSelect(s.id)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onSelect(s.id);}}} className={'map-station '+(active?'is-selected':'')} transform={'translate('+base.join(',')+') scale('+(1/(zoom*screenScale))+')'}><circle className="marker-hit" r={active?19:14} fill="transparent"/><g className="marker-glyph"><MarkerGlyph kind={active?'selected':'station'} size={active?9:6.5}/></g>{labelKeys.has(key)&&<g className="station-map-label"><rect x={stationLabel.x} y={stationLabel.y} width={Math.min(192,s.name.length*6.7+12)} height={stationLabel.height} rx="4" fill="white" fillOpacity=".95" stroke={active?'#ec0016':'#d9dce1'} strokeWidth={active?1.2:.7}/><text x={stationLabel.x+stationLabel.padding} y={stationLabel.y+14} fill={active?'#b40013':'#282d37'} fontSize="11" fontFamily="Segoe UI,Arial,sans-serif" fontWeight={active?700:500}>{s.name.length>27?s.name.slice(0,26)+'…':s.name}</text></g>}<title>{s.name+' – Quellenposition; Details im Stationsprofil'}</title></g>;})}
 {detail&&locations.map(l=>{const [x,y]=project(l.coordinates);return <g key={l.id} data-map-layer="location" transform={'translate('+x+','+y+') scale('+(1/Math.sqrt(zoom))+')'}><MarkerGlyph kind="location" size={5}/><title>{l.name+' · '+l.source_id+' · '+l.source_record_id+(l.quality_flags.length?' · '+l.quality_flags.join(', '):'')}</title></g>;})}
 {detail&&origin&&<g data-map-layer="anchor" transform={'translate('+project(origin).join(',')+') scale('+(1/Math.sqrt(zoom))+')'}><MarkerGlyph kind="anchor" size={5}/><text x={14} y={4} fill="#3c414b" fontSize="12" stroke="white" paintOrder="stroke" strokeWidth="3">Analysepunkt</text></g>}
 </g></svg>
 {detail&&!mapContext&&<div className="map-empty"><LocateFixed/><strong>Keine zugeordnete Kartenposition</strong><span>In den Quellen fehlt eine Position mit passender Stations-ID. Profil und Tabelle bleiben verfügbar.</span></div>}
 {mapContext&&tileFailed&&<div className="map-tile-warning" role="status">Grundkarte teilweise nicht erreichbar. Quellobjekte bleiben sichtbar.</div>}
 <div className="map-bottom">{mapContext&&<div className="map-scale" aria-label={'Maßstab '+scaleMetres+' Meter'}><span>{scaleMetres>=1000?Number((scaleMetres/1000).toPrecision(3)).toLocaleString('de-DE')+' km':scaleMetres.toLocaleString('de-DE')+' m'}</span><i style={{width:scaleMetres/metresPerPixel}}/></div>}<div className="map-attribution">{mapContext?<><StaticLink href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap-Mitwirkende · ODbL</StaticLink><br/>Positionen: OpenStation · Trainline / OSM</>:<><StaticLink href="https://www.bkg.bund.de" target="_blank" rel="noreferrer">© BKG (2026)</StaticLink> · <StaticLink href="https://www.govdata.de/dl-de/by-2-0" target="_blank" rel="noreferrer">dl-de/by-2-0</StaticLink> · <StaticLink href="https://sgx.geodatenzentrum.de/web_public/gdz/datenquellen/datenquellen_vg_nuts.pdf" target="_blank" rel="noreferrer">Datenquellen</StaticLink>{!detail&&<><br/>Positionen: OpenStation · <StaticLink href="https://github.com/trainline-eu/stations" target="_blank" rel="noreferrer">Trainline</StaticLink> / <StaticLink href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OSM · ODbL</StaticLink></>}</>}</div></div>
 </div>;
}
