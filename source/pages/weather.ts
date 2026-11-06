import {readData} from './assets';
import {timeBounds} from '../lib/integration';
import {assertRetainedWindow} from '../lib/retention';

type Native=Record<string,string>;
type TimeColumn={first:string;step?:number;deltas?:number[]};
type Member={name:string;count:number;constants:Record<string,string|null>;columns:Record<string,(string|null)[]>;times:Record<string,TimeColumn>};
type Packed={schemaVersion:string;sourceSha256:string;parameter_metadata:Native[];members:Member[]};
type Archive={id:string;packedPath:string;sha256:string;historical:boolean;retrievedAt:string;dataFiles:{name:string;firstDate:string;lastDate:string}[];[key:string]:any};
type Geography={start:string;end:string;coordinates:number[];name:string;height_m:number;[key:string]:any};
type WeatherStation={archives:Archive[];geography:Geography[]};
type Product={documentation:any;stations:Record<string,WeatherStation>};
type Index={products:Record<string,Product>;retention:Record<string,unknown>;freshness:any};
let indexPromise:Promise<Index>|undefined;
const archives=new Map<string,Promise<Packed>>();
const expandedTimes=new WeakMap<TimeColumn,number[]>();
const iso=(stamp:number)=>new Date(stamp).toISOString().replace('.000Z','+00:00');
const compact=(stamp:number)=>new Date(stamp).toISOString().slice(0,10).replaceAll('-','');
const dayStamp=(value:string)=>Date.parse(value.slice(0,4)+'-'+value.slice(4,6)+'-'+value.slice(6,8)+'T00:00Z');
function nativeStamp(value:string):number{
 if(!/^\d{10}(?::\d{2})?$/.test(value))return NaN;
 const instant=Date.parse(value.slice(0,4)+'-'+value.slice(4,6)+'-'+value.slice(6,8)+'T'+value.slice(8,10)+':'+(value.slice(11)||'00')+':00Z');
 if(!Number.isFinite(instant))return NaN;
 return renderNative(instant/60000,value.length===13)===value?instant:NaN;
}
function renderNative(minute:number,withMinutes:boolean){const value=new Date(minute*60000).toISOString();return value.slice(0,4)+value.slice(5,7)+value.slice(8,10)+value.slice(11,13)+(withMinutes?':'+value.slice(14,16):'');}
function timeAt(column:TimeColumn,i:number){
 const first=nativeStamp(column.first)/60000;if(column.step!==undefined)return first+column.step*i;
 let expanded=expandedTimes.get(column);if(!expanded){expanded=[first];for(const delta of column.deltas??[])expanded.push(expanded[expanded.length-1]+delta);expandedTimes.set(column,expanded);}return expanded[i];
}
function fieldAt(member:Member,key:string,i:number):string|null|undefined{
 if(Object.hasOwn(member.constants,key))return member.constants[key];
 if(member.times[key])return renderNative(timeAt(member.times[key],i),member.times[key].first.length===13);
 return member.columns[key]?.[i];
}
function nativeRow(member:Member,i:number):Native{
 const result:Native={};for(const key of [...Object.keys(member.constants),...Object.keys(member.columns),...Object.keys(member.times)]){const value=fieldAt(member,key,i);if(value!==null&&value!==undefined)result[key]=value;}return result;
}
function distance(a:number[],b:number[]){const rad=Math.PI/180,la=a[1]*rad,lb=b[1]*rad,dl=(b[1]-a[1])*rad,dn=(b[0]-a[0])*rad;return 6371008.8*2*Math.asin(Math.min(1,Math.sqrt(Math.sin(dl/2)**2+Math.cos(la)*Math.cos(lb)*Math.sin(dn/2)**2)));}
const overlaps=(archive:Archive,lo:string,hi:string)=>archive.dataFiles.some(d=>d.firstDate&&d.firstDate<=hi&&d.lastDate>=lo);
function pickStation(info:Product,anchor:number[],start:number,end:number){
 const lo=compact(start),hi=compact(end-1);let chosen:{full:boolean;metres:number;sid:string;geo:Geography;archives:Archive[]}|undefined;
 for(const [sid,station] of Object.entries(info.stations)){
  const selected=station.archives.filter(ar=>overlaps(ar,lo,hi));if(!selected.length)continue;
  for(const geo of station.geography){
   if(geo.start>lo||geo.end<hi)continue;const metres=distance(anchor,geo.coordinates);if(metres>50000)continue;
   let cursor=dayStamp(lo);const last=dayStamp(hi);
   const ranges=selected.flatMap(ar=>ar.dataFiles.map(d=>[d.firstDate,d.lastDate])).sort((a,b)=>a[0]<b[0]?-1:a[0]>b[0]?1:a[1]<b[1]?-1:a[1]>b[1]?1:0);
   for(const [begin,finish] of ranges){const left=dayStamp(begin),right=dayStamp(finish);if(left>cursor)break;if(right>=cursor)cursor=right+86400000;}
   const full=cursor>last;
   if(!chosen||(full&&!chosen.full)||(full===chosen.full&&(metres<chosen.metres||metres===chosen.metres&&sid<chosen.sid)))chosen={full,metres,sid,geo,archives:selected};
  }
 }
 return chosen;
}
async function packedArchive(archive:Archive){
 let pending=archives.get(archive.packedPath);
 if(pending){archives.delete(archive.packedPath);archives.set(archive.packedPath,pending);return pending;}
 pending=readData<Packed>(archive.packedPath).then(data=>{if(data.schemaVersion!=='dwd-columnar-archive/1'||data.sourceSha256!==archive.sha256)throw Error('Wetterarchiv passt nicht zum Quellenindex.');return data;}).catch(error=>{archives.delete(archive.packedPath);throw error;});
 archives.set(archive.packedPath,pending);while(archives.size>48)archives.delete(archives.keys().next().value!);return pending;
}
const applies=(row:Native,lo:string,hi:string)=>(row.Von_Datum??'')<=hi&&(row.Bis_Datum||'99991231')>=lo;
const sortedMetadataKey=(row:Native)=>JSON.stringify(Object.fromEntries(Object.entries(row).sort(([a],[b])=>a<b?-1:a>b?1:0)));
async function sourceRows(input:Archive[],start:number,end:number,signal?:AbortSignal){
 const lo=compact(start),hi=compact(end-1),ordered=[...input].sort((a,b)=>Number(b.historical)-Number(a.historical)||(a.retrievedAt>b.retrievedAt?-1:a.retrievedAt<b.retrievedAt?1:0)||(a.id<b.id?-1:a.id>b.id?1:0));
 const output=new Map<string,any>(),sources:any[]=[],metadata=new Map<string,Native>(),unresolved:any[]=[];
 // Fetch concurrently but consume in the archive precedence used by the local query.
 const packed=await Promise.all(ordered.map(packedArchive));
 for(let n=0;n<ordered.length;n++){
  signal?.throwIfAborted();const ar=ordered[n],data=packed[n],params=data.parameter_metadata;
  const src:any=Object.fromEntries(['id','url','sha256','retrievedAt','licence','historical','originalArtifact','retention'].filter(key=>Object.hasOwn(ar,key)).map(key=>[key,ar[key]]));src.members=[];
  for(const row of params.filter(row=>applies(row,lo,hi)))metadata.set(sortedMetadataKey(row),row);
  const utcDays=new Map<string,boolean>();
  for(const file of ar.dataFiles){
   if(!file.firstDate||file.firstDate>hi||file.lastDate<lo)continue;src.members.push(file.name);
   const member=data.members.find(m=>m.name===file.name);if(!member)throw Error('Wetterarchiv enthält nicht alle dokumentierten Tabellen.');
   for(let i=0;i<member.count;i++){
    // Fast numeric day filtering avoids expanding years of native strings for a one-day query.
    const timeColumn=member.times.MESS_DATUM;
    const instant=timeColumn?timeAt(timeColumn,i)*60000:NaN;
    if(Number.isFinite(instant)&&instant<dayStamp(lo))continue;
    if(Number.isFinite(instant)&&instant>=dayStamp(hi)+86400000)break;
    const native=fieldAt(member,'MESS_DATUM',i)??'',day=native.slice(0,8);if(day<lo)continue;if(day>hi)break;
    let utc=utcDays.get(day);if(utc===undefined){const applicable=params.filter(row=>applies(row,day,day));utc=applicable.length>0&&applicable.every(row=>((row['Zusatz-Info']??'')+' '+(row.Besonderheiten??'')).includes('UTC'));utcDays.set(day,utc);}
    if(!utc){if(unresolved.length<1000)unresolved.push({source_id:ar.id,native:nativeRow(member,i),quality_flags:['native_time_reference_requires_review']});continue;}
    const stamp=Number.isFinite(instant)?instant:nativeStamp(native);if(!Number.isFinite(stamp)||stamp<start||stamp>=end)continue;
    const key=iso(stamp);if(!output.has(key))output.set(key,{time_utc:key,source_id:ar.id,native:nativeRow(member,i)});
   }
  }
  if(src.members.length)sources.push(src);
 }
 return {rows:[...output.keys()].sort().map(key=>output.get(key)),unresolved_native_rows:unresolved,parameter_metadata:[...metadata.values()],sources};
}
export async function weatherQuery(query:URLSearchParams,bootstrap:any,signal?:AbortSignal){
 for(const key of query.keys())if(!['station','date','start','end'].includes(key)||query.getAll(key).length!==1)throw Error('Ungültige Wetterabfrage.');
 const day=query.get('date')??'',from=query.get('start')??'00:00',to=query.get('end')??'24:00';
 const bounds=timeBounds({date:day,start:from,end:to,mode:'rail'});assertRetainedWindow(day,bounds.end);
 const s=bootstrap.stations.find((station:any)=>station.id===query.get('station'));if(!s)throw Error('Unbekannter Bahnhof.');
 const index=await(indexPromise??=readData<Index>('/data/weather-packed/index.json').catch(error=>{indexPromise=undefined;throw error;}));signal?.throwIfAborted();
 const response:any={station_id:s.id,anchor_record_id:s.anchor_record_id,anchor_coordinates:s.map_anchor,window:{date:day,start:from,end:to,start_utc:iso(bounds.start),end_utc:iso(bounds.end),timezone:'Europe/Berlin',ambiguous_time_rule:'earlier occurrence (fold=0)'},retention:Object.fromEntries(Object.entries(index.retention).filter(([key])=>['startDate','endDate','methodVersion'].includes(key))),method_version:'dwd-nearest-dated-station/1.1.0',freshness:index.freshness,products:[],quality_flags:['regional_weather_context_not_station_site_measurement','no_spatial_interpolation','station_selected_separately_per_product','recent_data_quality_control_incomplete','missing_values_not_zero','measurement_intervals_not_reconstructed','precipitation_report_sum_not_exact_window_total']};
 response.products=await Promise.all(Object.entries(index.products).map(async([id,info])=>{
  const base:any={id,documentation:info.documentation,availability:'outside_coverage',rows:[]},choice=s.map_anchor?pickStation(info,s.map_anchor,bounds.start,bounds.end):undefined;
  if(!choice){base.reason=s.map_anchor?'no_dated_weather_station_within_50km':'no_verified_analysis_anchor';return base;}
  const data=await sourceRows(choice.archives,bounds.start,bounds.end,signal);
  return {...base,...data,station_id:choice.sid,station_name:choice.geo.name,coordinates:choice.geo.coordinates,height_m:choice.geo.height_m,distance_m:Math.round(choice.metres*10)/10,geography:choice.geo,availability:data.rows.length?'present':'unknown',missing_code:'-999'};
 }));return response;
}
