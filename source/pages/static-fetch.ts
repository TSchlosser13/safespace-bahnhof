import {assetResponse,readData,BASE} from './assets';
import {weatherQuery} from './weather';
let bootstrap:Promise<any>|undefined;
function catalogue(){return bootstrap??=(readData('/data/pages-bootstrap.json').catch(error=>{bootstrap=undefined;throw error;}));}
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json; charset=utf-8'}});
export async function staticFetch(input:RequestInfo|URL,init?:RequestInit):Promise<Response>{
 const raw=input instanceof Request?input.url:String(input),url=new URL(raw,location.href);
 if(url.origin!==location.origin)return fetch(input,init);
 let path=url.pathname;if(path.startsWith(BASE))path='/'+path.slice(BASE.length);
 if(path.startsWith('/data/'))return assetResponse(path,init);
 if(!path.startsWith('/api/'))return fetch(input,init);
 if((init?.method??(input instanceof Request?input.method:'GET')).toUpperCase()!=='GET')return json({error:'Diese statische Website verwendet veröffentlichte Snapshots. Neue Abrufe erfolgen im lokalen Projekt vor einer neuen Veröffentlichung.'},405);
 try{
  if(path==='/api/research'){
   const action=url.searchParams.get('action')??'bootstrap';
   if(action==='bootstrap')return assetResponse('/data/pages-bootstrap.json',init);
   if(action==='history')return assetResponse('/data/pages-history.json',init);
   if(action==='osm'){
    const id=url.searchParams.get('station'),radius=Number(url.searchParams.get('radius')),station=(await catalogue()).stations.find((s:any)=>s.id===id);
    if(!station||![250,500,1000].includes(radius))return json({error:'Ungültiger Bahnhof oder Radius.'},400);
    return station.map_anchor?assetResponse('/data/integration/osm/snapshots/'+id!.replace(':','-')+'/'+radius+'.json',init):json(null);
   }
  }
  if(path==='/api/weather')return json(await weatherQuery(url.searchParams,await catalogue(),init?.signal??undefined));
  if(path==='/api/facility-status'){
   if(url.searchParams.get('refresh')==='1')return json({error:'Der Anlagenstatus ist eine veröffentlichte Momentaufnahme; kein Live-Abruf auf GitHub Pages.'},405);
   return assetResponse('/data/integration/siri-live.json',init);
  }
  return json({error:'Unbekannte statische Abfrage.'},404);
 }catch(error){if(init?.signal?.aborted)throw error;return json({error:(error as Error).message},400);}
}
