'use client';
import {Checkbox} from '@/components/ui/checkbox';
export type SymbolKind='station'|'selected'|'cluster'|'location'|'equipment'|'platforms'|'entrances'|'footways'|'amenities'|'lights'|'anchor'|'buffer';
export const mapLayers:{id:SymbolKind;label:string;color:string}[]=[
 {id:'equipment',label:'DB-Ausstattungsstandorte',color:'#646973'},
 {id:'platforms',label:'Kartierte Bahnsteige',color:'#1e5b91'},
 {id:'entrances',label:'Kartierte Eingänge',color:'#a84b08'},
 {id:'footways',label:'Fußwege & Treppen',color:'#36734e'},
 {id:'amenities',label:'Versorgung & Ausstattung',color:'#775393'},
 {id:'lights',label:'Kartierte Leuchten',color:'#967000'},
];
export function symbolColor(kind:SymbolKind){return kind==='location'?'#1e5b91':mapLayers.find(x=>x.id===kind)?.color??(kind==='station'?'#646973':'#ec0016');}
export function MarkerGlyph({kind,size=4}:{kind:SymbolKind;size?:number}){
 const color=symbolColor(kind),r=size;
 switch(kind){
  case 'station':case 'selected':return <g transform={'scale('+(r/8)+')'}>{kind==='selected'&&<rect x="-11.5" y="-12.5" width="23" height="25" rx="6" fill="white" stroke="#ec0016" strokeWidth="1.3"/>}<rect x="-9" y="-10" width="18" height="20" rx="4" fill={kind==='selected'?'#ec0016':'#3c414b'} stroke="white" strokeWidth="1.5"/><rect x="-5.5" y="-6.5" width="11" height="7" rx="1.4" fill="white"/><path d="M0 -6.5 V.5 M-5 7 L-3 4.5 M5 7 L3 4.5" stroke="white" strokeWidth="1.2"/><circle cx="-3.5" cy="3.5" r="1.2" fill="white"/><circle cx="3.5" cy="3.5" r="1.2" fill="white"/></g>;
  case 'cluster':return <g><circle r={r*1.8} fill="white" stroke="#3c414b" strokeWidth="1.4"/><text textAnchor="middle" dy=".35em" fill="#282d37" stroke="none" fontSize={r*2.1} fontWeight="700" fontFamily="Segoe UI,Arial,sans-serif">3</text></g>;
  case 'location':return <g fill={color} stroke="white" strokeWidth=".9"><path d={'M0 '+r*1.55+' C'+(-r*.4)+' '+r*.85+' '+(-r*1.15)+' '+r*.15+' '+(-r*1.15)+' '+(-r*.55)+' A'+r*1.15+' '+r*1.15+' 0 1 1 '+r*1.15+' '+(-r*.55)+' C'+r*1.15+' '+r*.15+' '+r*.4+' '+r*.85+' 0 '+r*1.55+' Z'}/><circle cy={-r*.55} r={r*.35} fill="white" stroke="none"/></g>;
  case 'equipment':return <rect x={-r} y={-r} width={2*r} height={2*r} fill={color} stroke="white" strokeWidth=".9"/>;
  case 'platforms':return <rect x={-r*1.4} y={-r*.65} width={r*2.8} height={r*1.3} fill={color} stroke="white" strokeWidth=".9"/>;
  case 'entrances':return <path d={'M0 '+(-r*1.3)+' L'+(r*1.2)+' '+r+' L'+(-r*1.2)+' '+r+' Z'} fill={color} stroke="white" strokeWidth=".9"/>;
  case 'footways':return <path d={'M'+(-r*1.6)+' '+r+' L0 '+(-r)+' L'+(r*1.6)+' 0'} fill="none" stroke={color} strokeWidth="2" strokeDasharray="3 1"/>;
  case 'amenities':return <path d={'M0 '+(-r*1.3)+' L'+(r*1.3)+' 0 L0 '+(r*1.3)+' L'+(-r*1.3)+' 0 Z'} fill={color} stroke="white" strokeWidth=".9"/>;
  case 'lights':return <g stroke={color} strokeWidth="1.5"><circle r={r*.48} fill={color}/><path d={'M0 '+(-r*1.5)+' V'+(-r*.8)+' M0 '+r*.8+' V'+r*1.5+' M'+(-r*1.5)+' 0 H'+(-r*.8)+' M'+r*.8+' 0 H'+r*1.5}/></g>;
  case 'anchor':return <g fill="none" stroke={color} strokeWidth="1.5"><circle r={r}/><path d={'M'+(-r*1.7)+' 0 H'+r*1.7+' M0 '+(-r*1.7)+' V'+r*1.7}/></g>;
  case 'buffer':return <circle r={r*1.4} fill="#ec001609" stroke={color} strokeWidth="1.3" strokeDasharray="3 2"/>;
  default:return <circle r={r} fill={kind==='selected'?color:'white'} stroke={color} strokeWidth={kind==='selected'?1.5:1.1}/>;
 }
}
export function MapSymbol({kind}:{kind:SymbolKind}){return <svg className="map-symbol" viewBox="-12 -12 24 24" aria-hidden="true"><MarkerGlyph kind={kind} size={kind==='station'||kind==='selected'?6:4}/></svg>;}
export function MapLegend({detail=false,layers=[],onToggle}:{detail?:boolean;layers?:string[];onToggle?:(id:string)=>void}){
 return <div className="map-legend"><h3>{detail?'Legende & Ebenen':'Kartenlegende'}</h3>
 {detail?<>
  {mapLayers.map(({id,label})=><label className="legend-row" key={id}><Checkbox aria-label={label} checked={layers.includes(id)} onCheckedChange={()=>onToggle?.(id)}/><MapSymbol kind={id}/><span>{label}</span></label>)}
  <div className="legend-divider"/>
  <div className="legend-row"><MapSymbol kind="location"/><span>Kartenposition (Quelle)</span></div>
  <div className="legend-row"><MapSymbol kind="anchor"/><span>Analysepunkt</span></div>
  <div className="legend-row"><MapSymbol kind="buffer"/><span>Analytischer Puffer</span></div>
  <p className="legend-caption">Kartenpositionen dienen der Orientierung. Puffer ≠ Stationsgrenze.</p>
 </>:<>
  <div className="legend-row"><MapSymbol kind="station"/><span>Bahnhof</span></div>
  <div className="legend-row"><MapSymbol kind="selected"/><span>Ausgewählte Station</span></div>
  <div className="legend-row"><MapSymbol kind="cluster"/><span>Stationsgruppe · Klick zoomt</span></div>
 </>}
 </div>;
}
