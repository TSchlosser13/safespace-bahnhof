export type ResearchPeriod={startDate:string;endDate:string};
export type ResearchDataset={id:string;title:string;columns:string[];rows:number;dataUrl:string;sourceUrl?:string;description?:string;period?:ResearchPeriod|null;periodLabel?:string;referenceDate?:string|null;stationIds?:string[]};
export type ResearchSource={sourceId:string;title:string;summary:string;status:string;kind:string;scope:string;period?:ResearchPeriod|null;periodLabel?:string;referenceDate?:string|null;limitations:string[];datasets:ResearchDataset[];downloads?:{title:string;url:string;features?:number}[];stations?:Record<string,string>};
export type ResearchManifest={schemaVersion:string;generatedAt:string;sources:ResearchSource[];exclusions?:string[]};
export type ResearchTable={id:string;title:string;columns:string[];rows:Record<string,unknown>[];period?:ResearchPeriod|null;periodLabel?:string;referenceDate?:string|null;sourceUrl?:string;definitions?:unknown;description?:string;columnLabels?:Record<string,string>;[key:string]:unknown};
export type StationResearch={stationId:string;datasets:ResearchTable[];[key:string]:unknown};
export type ResearchStationResult={sources:Record<string,StationResearch>;errors:string[]};
export function researchDataUrl(value:string):string{
 if(!/^\/data\/integration\/research-sources\/[a-z0-9_/-]+\.json$/.test(value)||value.includes('..'))throw Error('Ungültiger lokaler Datenpfad.');
 return value;
}
export function validateResearchTable(value:unknown):ResearchTable{
 const t=value as ResearchTable;
 if(!t||typeof t.id!=='string'||typeof t.title!=='string'||!Array.isArray(t.columns)||!t.columns.every(c=>typeof c==='string')||!Array.isArray(t.rows)||!t.rows.every(r=>r&&typeof r==='object'&&!Array.isArray(r)))throw Error('Ungültige Quelltabelle.');
 return t;
}
export type ResearchManifestResult={manifest?:ResearchManifest;error:string};
export async function loadResearchManifest(read:(url:string)=>Promise<unknown>):Promise<ResearchManifestResult>{
 try{
  const manifest=await read('/data/integration/research-sources/manifest.json') as ResearchManifest;
  if(!manifest||!Array.isArray(manifest.sources)||!manifest.sources.every(source=>source&&typeof source.sourceId==='string'&&typeof source.title==='string'&&Array.isArray(source.datasets)&&Array.isArray(source.limitations)))throw Error('Ungültige Quellenübersicht.');
  return {manifest,error:''};
 }catch(error){return {error:'Ergänzende Quellen: '+(error as Error).message};}
}
export function assignedResearchSources(manifest:ResearchManifest,stationId:string):ResearchSource[]{return manifest.sources.filter(source=>source.stations?.[stationId]);}
export async function loadStationResearch(manifest:ResearchManifest,stationId:string,read:(url:string)=>Promise<unknown>):Promise<ResearchStationResult>{
 const result:ResearchStationResult={sources:{},errors:[]};
 await Promise.all(assignedResearchSources(manifest,stationId).map(async source=>{
  try{
   const data=await read(researchDataUrl(source.stations![stationId])) as StationResearch;
   if(data?.stationId!==stationId||!Array.isArray(data.datasets))throw Error('Stationskennung stimmt nicht überein.');
   data.datasets.forEach(validateResearchTable);result.sources[source.sourceId]=data;
  }catch(e){result.errors.push(source.title+': '+(e as Error).message);}
 }));
 return result;
}
export function requestStationResearch(cache:Map<string,Promise<ResearchStationResult>>,manifest:ResearchManifest,stationId:string,read:(url:string)=>Promise<unknown>):Promise<ResearchStationResult>{
 const cached=cache.get(stationId);if(cached)return cached;
 const pending=loadStationResearch(manifest,stationId,read).then(result=>{
  // Successful and in-flight requests are reusable; failed reads must remain retryable.
  if(result.errors.length&&cache.get(stationId)===pending)cache.delete(stationId);
  return result;
 },error=>{if(cache.get(stationId)===pending)cache.delete(stationId);throw error;});
 cache.set(stationId,pending);return pending;
}
export function researchPeriod(value:{period?:ResearchPeriod|null;periodLabel?:string;referenceDate?:string|null}):string{
 const day=(s:string)=>/^\d{4}-\d{2}-\d{2}$/.test(s)?s.split('-').reverse().join('.'):s;
 return value.periodLabel??(value.period?day(value.period.startDate)+'–'+day(value.period.endDate):value.referenceDate?'Referenz: '+day(value.referenceDate):'Referenzdaten mit einzeln dokumentierten Quellenständen');
}
