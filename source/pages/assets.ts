export const BASE='/safespace-bahnhof/';
export const isPacked=(path:string)=>path.startsWith('/data/')&&/\.(?:json|geojson)$/.test(path);
export function assetUrl(path:string){return path.startsWith('/')&&!path.startsWith('//')&&!path.startsWith(BASE)?BASE+path.slice(1):path;}
export async function assetResponse(path:string,init?:RequestInit):Promise<Response>{
 const packed=isPacked(path),response=await fetch(assetUrl(path+(packed?'.gz':'')),init);
 if(!response.ok||!packed)return response;
 if(!response.body||typeof DecompressionStream==='undefined')throw Error('Bitte einen aktuellen Browser mit Unterstützung für komprimierte Dateien verwenden.');
 return new Response(response.body.pipeThrough(new DecompressionStream('gzip')),{status:response.status,headers:{'Content-Type':path.endsWith('.geojson')?'application/geo+json':'application/json'}});
}
export async function readData<T=any>(path:string,signal?:AbortSignal):Promise<T>{
 const response=await assetResponse(path,{signal});if(!response.ok)throw Error('Veröffentlichte Datei nicht verfügbar: '+path+' (HTTP '+response.status+')');return response.json();
}
export function fileName(path:string){return path.split('/').at(-1)||'daten.json';}
export async function saveDataFile(path:string,name?:string){
 const response=await assetResponse(path);if(!response.ok)throw Error('Datei konnte nicht geladen werden.');
 const url=URL.createObjectURL(await response.blob()),a=document.createElement('a');a.href=url;a.download=name||fileName(path);a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);
}
