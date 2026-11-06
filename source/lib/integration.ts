import type {Profile,Value,Indicator} from './types';
import {freshness} from './freshness';
import {assertRetainedWindow,retentionEnd,retainedDate,latestReferenceSnapshot,timetableStart,timetableEnd} from './retention';
export type TimeWindow={date:string;start:string;end:string;mode:'rail'|'all'};
export const defaultWindow:TimeWindow={date:[freshness.defaultAnalysisDate,retentionEnd].sort()[0],start:'00:00',end:'24:00',mode:'rail'};
export type IntegratedContext={window:TimeWindow;shared?:any;timetable?:any;geodata?:any;infrastructure?:any;weather?:any;dictionary?:any;facilityHistory?:any;researchManifest?:import('./research-sources').ResearchManifest;research?:Record<string,import('./research-sources').StationResearch>;researchReady?:boolean;researchErrors?:string[];ready?:boolean;errors?:string[]};
export function censusContext(input:any){
 if(!input)return null;
 const {station_id,anchor_record_id,anchor_coordinates,method_version,census}=input;
 return {station_id,anchor_record_id,anchor_coordinates,method_version,census};
}
const fmt=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Berlin',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});
function parts(t:number){return Object.fromEntries(fmt.formatToParts(t).map(p=>[p.type,p.value]));}
function wall(t:number){const p=parts(t);return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;}
export function resolveLocal(day:string,time:string):number{
 if(!/^\d{4}-\d{2}-\d{2}$/.test(day)||!(/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time)||time==='24:00'))throw Error('Datum oder Uhrzeit ungültig.');
 const naive=Date.parse(day+'T'+(time==='24:00'?'00:00':time)+':00Z')+(time==='24:00'?86400000:0);
 if(!Number.isFinite(naive)||new Date(Date.parse(day+'T00:00Z')).toISOString().slice(0,10)!==day)throw Error('Datum ungültig.');
 const target=new Date(naive).toISOString().slice(0,16),offsets=new Set([-86400000,0,86400000].map(delta=>{const t=naive+delta,p=parts(t);return Date.parse(`${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}Z`)-t;}));
 const candidates=[...offsets].map(offset=>naive-offset).filter(t=>wall(t)===target).sort((a,b)=>a-b);
 if(!candidates.length)throw Error('Diese Uhrzeit existiert beim Wechsel zur Sommerzeit nicht.');return candidates[0];
}
export function timeBounds(w:TimeWindow){const start=resolveLocal(w.date,w.start);let end=resolveLocal(w.date,w.end);if(end<=start){const tomorrow=new Date(Date.parse(w.date+'T12:00Z')+86400000).toISOString().slice(0,10);end=resolveLocal(tomorrow,w.end);}return {start,end,hours:(end-start)/3600000};}
export const windowLabel=(w:TimeWindow)=>`${w.date} · ${w.start}–${w.end}${w.end<=w.start?' (+1 Tag)':''} · Europe/Berlin · ${w.mode==='rail'?'Eisenbahn':'alle Verkehrsmittel'}`;
export type Departure={time:number;serviceDate:string;tripId:string;stopId:string;sequence:number;routeId:string;route:string;direction:string;mode:string;headsign:string;pickupType:number};
export function activeService(c:any,day:string){const compact=day.replaceAll('-','');if(c.removed?.includes(compact))return false;if(c.added?.includes(compact))return true;const weekday=(new Date(day+'T12:00Z').getUTCDay()+6)%7;return compact>=c.start&&compact<=c.end&&c.weekdays?.[weekday]==='1';}
function computeDepartures(context:IntegratedContext):{events:Departure[];availability:Value['availability'];flags:string[];hours:number;intervals:any[]}{
 const {shared:s,timetable:t,window:w}=context;const empty={events:[],availability:'not_collected' as Value['availability'],flags:[],hours:0,intervals:[]};
 if(!s||!t)return {...empty,flags:['timetable_source_not_loaded']};
 if(t.availability!=='present')return {...empty,availability:'outside_coverage',flags:['no_verified_gtfs_stop_match']};
 const represented=Object.values(t.trips).some((trip:any)=>{const mode=Number(s.routes[trip.routeId]?.mode);return w.mode==='all'||mode===2||(mode>=100&&mode<=199);});
 if(!represented)return {...empty,availability:'unknown',flags:['selected_mode_not_covered']};
 let bounds;try{bounds=timeBounds(w);}catch{return {...empty,availability:'unknown',flags:['invalid_or_nonexistent_local_time']};}
 if(wall(bounds.start).slice(0,10)<s.coverage.start||wall(bounds.end-1).slice(0,10)>s.coverage.end)return {...empty,hours:bounds.hours,availability:'outside_coverage',flags:['outside_feed_validity']};
 const events:Departure[]=[],seen=new Set<string>();
 for(const [day,stamp] of Object.entries(s.serviceDayAnchors??{})){
  const anchor=Date.parse(stamp as string);if(anchor>=bounds.end||anchor+t.maxDepartureSeconds*1000<bounds.start)continue;
  const services=new Set(Object.entries(s.calendars).filter(([,c])=>activeService(c,day)).map(([id])=>id));
  for(const [tripId,stopId,sequence,seconds,pickupType] of t.events){
   const trip=t.trips[tripId],route=trip&&s.routes[trip.routeId];if(!route||!services.has(trip.serviceId)||pickupType===1)continue;
   const mode=Number(route.mode);if(w.mode==='rail'&&mode!==2&&!(mode>=100&&mode<=199))continue;
   const time=anchor+seconds*1000,key=tripId+':'+sequence+':'+day;
   if(time<bounds.start||time>=bounds.end||seen.has(key))continue;seen.add(key);
   events.push({time,serviceDate:day,tripId,stopId,sequence,routeId:trip.routeId,route:route.name,direction:trip.directionId??'unknown',mode:String(route.mode),headsign:trip.headsign??'',pickupType});
  }
 }
 events.sort((a,b)=>a.time-b.time||a.tripId.localeCompare(b.tripId));
 const groups=new Map<string,Departure[]>();for(const e of events){const key=e.routeId+':'+e.direction+':'+e.mode;groups.set(key,[...(groups.get(key)??[]),e]);}
 const intervals=[...groups].map(([key,items])=>({key,route:items[0].route,direction:items[0].direction,mode:items[0].mode,minutes:items.slice(1).map((e,i)=>(e.time-items[i].time)/60000)}));
 const firstDay=wall(bounds.start).slice(0,10),lastDay=wall(bounds.end-1).slice(0,10);
 const partialBoundary=(s.boundaryLimitations?.potentiallyIncompleteCivilDates??[]).some((day:string)=>day>=firstDay&&day<=lastDay);
 const flags=[...t.qualityFlags,...(partialBoundary?['prior_service_day_carry_in_not_retained']:[]),'scheduled_records_not_physical_train_or_person_counts',...(events.some(e=>e.pickupType===2||e.pickupType===3)?['conditional_pickup_present']:[])];
 const incomplete=flags.some(f=>['prior_service_day_carry_in_not_retained','frequency_service_not_supported','flexible_service_not_supported','missing_departure_time','ambiguous_stop_identifiers_excluded','conflicting_event_identity'].includes(f));
 return {events,availability:incomplete?'unknown':'present',flags,hours:bounds.hours,intervals};
}
export function departures(context:IntegratedContext){return computeDepartures(context);}
const operational=new Set(['departures','departures_per_hour','first_departure','last_departure','service_intervals']);
export const integratedIds=new Set([...operational,'population','population_reported','weather_temperature','weather_rain','facility_available','facility_unavailable']);
export function integratedValues(p:Profile,i:Indicator,radius:number,c:IntegratedContext|undefined,base:Value):Value[]{
 let v:Value={...base,source_format:undefined,source_url:null,source_sha256:null,retrieved_at:null,reference_period:null,licence:null,availability:c?.ready?'unknown':'not_collected',derivation_method:'not_computed',quality_flags:c?.errors?.length?['integrated_source_read_failed']:['integrated_source_not_loaded']};
 if(!c)return [v];
 const foreign=(c.timetable&&operational.has(i.id)&&c.timetable.stationId!==p.station.id)||(c.infrastructure&&i.id.startsWith('facility_')&&c.infrastructure.station_id!==p.station.id)||(c.geodata&&i.id.startsWith('population')&&(c.geodata.station_id!==p.station.id||c.geodata.anchor_record_id!==p.station.anchor_record_id||JSON.stringify(c.geodata.anchor_coordinates)!==JSON.stringify(p.station.map_anchor)))||(c.weather&&i.id.startsWith('weather_')&&(c.weather.station_id!==p.station.id||c.weather.anchor_record_id!==p.station.anchor_record_id));
 if(foreign)return [{...v,availability:'unknown',quality_flags:['incompatible_integrated_source_scope']}];
 const {window:w}=c;
 if(operational.has(i.id)){
  let endDay;try{endDay=wall(timeBounds(w).end-1).slice(0,10);}catch{return [{...v,value:null,availability:'unknown',source_record_ids:[],quality_flags:['invalid_or_nonexistent_local_time']}];}
  if(w.date<timetableStart||w.date>timetableEnd||endDay>timetableEnd)return [{...v,value:null,availability:'outside_coverage',source_record_ids:[],quality_flags:['outside_retained_timetable_period']}];
  const result=departures(c),prov=c.shared?.provenance;v={...v,availability:result.availability,reference_period:windowLabel(w)+'; DST overlap: earlier occurrence (fold=0)',source_url:prov?.sourceUrl??null,source_sha256:prov?.sourceSha256??null,retrieved_at:prov?.retrievedAt??null,licence:prov?.licence??null,source_format:'GTFS CSV',spatial_scope:`matched_boarding_stops;mode:${w.mode}`,derivation_method:'calendar_resolved_scheduled_events',source_record_ids:result.events.map(e=>`${e.tripId}/${e.sequence}/${e.serviceDate}`),quality_flags:result.flags,method_version:'gtfs-window/1.0.0'};
  if(result.availability!=='present')return [v];
  if(i.id==='departures')v.value=result.events.length;
  if(i.id==='departures_per_hour'){v.value=result.events.length/result.hours;v.denominator=result.hours;}
  if(i.id==='first_departure'||i.id==='last_departure'){const e=i.id==='first_departure'?result.events[0]:result.events.at(-1);v.value=e?new Date(e.time).toLocaleString('de-DE',{timeZone:'Europe/Berlin',dateStyle:'short',timeStyle:'short'}):null;if(!e)v.availability='not_applicable';}
  if(i.id==='service_intervals'){return result.intervals.filter(g=>g.minutes.length).map(g=>({...v,subarea_id:g.key,value:g.minutes.map((n:number)=>Number(n.toFixed(2))).join('; '),source_record_ids:result.events.filter(e=>e.routeId+':'+e.direction+':'+e.mode===g.key).map(e=>`${e.tripId}/${e.sequence}/${e.serviceDate}`),spatial_scope:v.spatial_scope+`;route_direction:${g.key}`})).concat(result.intervals.some(g=>g.minutes.length)?[]:[{...v,availability:'not_applicable',value:null}]);}
  return [v];
 }
 if(i.id.startsWith('population')){
  if(!latestReferenceSnapshot('zensus'))return [{...v,value:null,availability:'outside_coverage',reference_period:'2022-05-15',source_record_ids:[],quality_flags:['reference_snapshot_not_enabled'],spatial_scope:'not_evaluated_under_reference_policy'}];
  const pop=c.geodata?.census?.population_by_radius?.[radius],prov=c.dictionary?.datasets?.find((d:any)=>d.id==='population-2022-all-resolutions'||d.dataset_id==='population-2022-all-resolutions')?.provenance;
  v={...v,spatial_scope:`buffer:${radius}m;anchor:${p.station.anchor_record_id}`,reference_period:c.geodata?.census?.reference_period??prov?.referencePeriod??'2022-05-15',source_format:'Zensus CSV',source_url:prov?.url??null,source_sha256:prov?.sha256??null,retrieved_at:prov?.retrievedAt??null,licence:prov?.licence??null,derivation_method:'100m_grid_centroid_inclusion',method_version:c.geodata?.method_version??'census-centroid/1.0.0',quality_flags:['latest_reference_snapshot','reference_snapshot_not_selected_date',...(pop?.quality_flags??[p.station.map_anchor?'census_source_not_loaded':'no_verified_analysis_anchor'])],source_record_ids:pop?.source_record_ids??[],availability:pop?.availability??(p.station.map_anchor?'not_collected':'outside_coverage')};
  v.value=i.id==='population_reported'?pop?.reported_sum??null:pop?.value??null;
  if(i.id==='population_reported'){v.availability=v.value===null?v.availability:'present';v.quality_flags=[...v.quality_flags,'partial_reported_sum_not_full_population','not_statistical_lower_bound'];if(pop)v.coverage={expected_cells:pop.expected_cells,reported_cells:pop.reported_cells,numeric_cells:pop.numeric_cells,missing_cells:pop.missing_cells,suppressed_or_non_numeric_cells:pop.suppressed_or_non_numeric_cells};}
  return [v];
 }
 if(i.id.startsWith('facility_')){
  const inf=c.infrastructure,prov=inf?.siri_provenance,records=inf?.facilities??[];const status=i.id==='facility_available'?'available':'notAvailable';
  if(inf?.siri_availability==='outside_coverage'||((prov||records.length)&&!retainedDate(prov?.referencePeriod)))return [{...v,value:null,availability:'outside_coverage',reference_period:prov?.referencePeriod??inf?.siri_exclusion?.referencePeriod??null,source_record_ids:[],quality_flags:['outside_retained_period','facility_status_unavailable_for_retained_period']}];
  const matches=records.filter((r:any)=>r.status===status);v={...v,reference_period:prov?.referencePeriod??null,source_format:'SIRI XML',source_url:prov?.url??null,source_sha256:prov?.sha256??null,retrieved_at:prov?.retrievedAt??null,licence:prov?.licence??null,derivation_method:'exact_facility_id_join_and_status_count',quality_flags:inf?.quality_flags??['source_not_loaded'],source_record_ids:matches.map((r:any)=>r.id)};
  if(records.length){v.value=matches.length;v.availability='present';}return [v];
 }
 const productId=i.id==='weather_temperature'?'air_temperature':'precipitation',field=i.id==='weather_temperature'?'TT_TU':'R1',product=c.weather?.products?.find((x:any)=>x.id===productId),rawRows=product?.rows??[];
 let bounds;try{bounds=timeBounds(w);assertRetainedWindow(w.date,bounds.end);}catch{return [{...v,value:null,availability:'outside_coverage',source_record_ids:[],quality_flags:['invalid_or_outside_retained_window']}];}
 const rows=rawRows.filter((r:any)=>{const native=String(r.native?.MESS_DATUM??''),nativeDay=`${native.slice(0,4)}-${native.slice(4,6)}-${native.slice(6,8)}`,instant=Date.parse(r.time_utc??'');return retainedDate(nativeDay)&&Number.isFinite(instant)&&instant>=bounds.start&&instant<bounds.end;});
 const excludedRows=rawRows.length-rows.length;
 if(rawRows.length&&!rows.length)return [{...v,value:null,availability:'outside_coverage',source_record_ids:[],quality_flags:['weather_rows_outside_period_or_window']}];
 const valid=rows.filter((r:any)=>r.native[field]!==''&&Number.isFinite(Number(r.native[field]))&&Number(r.native[field])!==-999&&(field!=='R1'||Number(r.native[field])>=0));const used=new Set(valid.map((r:any)=>r.source_id));const sources=(product?.sources??[]).filter((s:any)=>used.has(s.id));
 v={...v,availability:product?.availability??(p.station.map_anchor?'not_collected':'outside_coverage'),source_format:'DWD semicolon text',spatial_scope:product?.station_id?`DWD:${product.station_id};distance_m:${product.distance_m}`:'no_matched_DWD_station',reference_period:windowLabel(w)+'; DST overlap: earlier occurrence (fold=0)',source_url:sources[0]?.url??null,source_sha256:sources.map((s:any)=>s.sha256).join('; ')||null,retrieved_at:sources[0]?.retrievedAt??null,licence:sources[0]?.licence??null,source_record_ids:valid.map((r:any)=>`${product.station_id}/${r.native.MESS_DATUM}/${field}`),derivation_method:i.id==='weather_temperature'?'mean_of_valid_hourly_reports':'sum_of_valid_hourly_precipitation_reports',quality_flags:[...(c.weather?.quality_flags??[]),'source_parameter_quality_codes_preserved',...(excludedRows?['weather_rows_outside_period_or_window']:[])],method_version:'dwd-nearest-dated-station/1.0.0',denominator:valid.length};
 const hours=bounds.hours;
 v.coverage={window_hours:hours,reported_rows:rows.length,valid_rows:valid.length};
 if(valid.length){const sum=valid.reduce((n:number,r:any)=>n+Number(r.native[field]),0);if(i.id==='weather_temperature'){v.value=sum/valid.length;v.availability='present';if(valid.length!==hours)v.quality_flags.push('partial_hourly_sample_mean');}else if(valid.length===hours&&w.start.endsWith(':00')&&w.end.endsWith(':00')){v.value=sum;v.availability='present';}else{v.availability='unknown';v.quality_flags.push('incomplete_or_non_hour_aligned_precipitation_window');}}else if(v.availability==='present'){v.availability='unknown';v.quality_flags.push('all_measurements_missing');}
 return [v];
}
