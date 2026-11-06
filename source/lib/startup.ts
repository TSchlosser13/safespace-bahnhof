import {staticFetch} from '../pages/static-fetch';
import type {Station} from './types';

export type StartupProgress={value:number;message:string};
export type StationBootstrap={stations:Station[];examples:string[];provenance:Record<string,any>;sources:any[];location_sources:any};

const validPosition=(value:unknown)=>Array.isArray(value)&&value.length===2&&value.every(coordinate=>typeof coordinate==='number'&&Number.isFinite(coordinate));
function validStation(station:Station){
 return !!station&&typeof station.id==='string'&&typeof station.name==='string'&&typeof station.state==='string'&&Array.isArray(station.eva_ids)
  &&(station.map_anchor==null||validPosition(station.map_anchor))
  &&(station.map_locations==null||(Array.isArray(station.map_locations)&&station.map_locations.every(location=>location&&(!location.eligible||validPosition(location.coordinates)))));
}

// Percentages describe completed startup stages. Byte progress is used only when
// the response supplies a usable, uncompressed length; time never implies readiness.
export async function loadStationCatalogue(signal:AbortSignal,onProgress:(progress:StartupProgress)=>void):Promise<StationBootstrap>{
 const response=await staticFetch('/api/research',{signal});
 if(!response.ok){
  const detail=await response.json().catch(()=>null) as {error?:string}|null;
  throw new Error(detail?.error||'Stationsdaten sind momentan nicht erreichbar. Bitte erneut versuchen.');
 }
 onProgress({value:20,message:'Stationskatalog wird geladen …'});
 const encoding=response.headers.get('Content-Encoding');
 const length=(!encoding||encoding==='identity')?Number(response.headers.get('Content-Length')):0;
 let text='';
 if(response.body){
  const reader=response.body.getReader(),decoder=new TextDecoder();let received=0,lastProgress=20;
  try{
   while(true){
    const {done,value}=await reader.read();if(done)break;
    received+=value.byteLength;text+=decoder.decode(value,{stream:true});
    const progress=length>0?Math.min(85,20+Math.floor(received/length*65)):35;
    if(progress>lastProgress){lastProgress=progress;onProgress({value:progress,message:'Stationskatalog wird geladen …'});}
   }
   text+=decoder.decode();
  }finally{reader.releaseLock();}
 }else{text=await response.text();}
 signal.throwIfAborted();
 onProgress({value:90,message:'Stationsauswahl wird vorbereitet …'});
 let data:StationBootstrap;
 try{data=JSON.parse(text);}catch{throw new Error('Der Stationskatalog konnte nicht gelesen werden. Bitte erneut versuchen.');}
 if(!data||!Array.isArray(data.stations)||!data.stations.length||!Array.isArray(data.examples)||!data.provenance||!Array.isArray(data.sources)||!data.stations.every(validStation)){
  throw new Error('Der Stationskatalog ist unvollständig. Bitte erneut versuchen.');
 }
 return data;
}
