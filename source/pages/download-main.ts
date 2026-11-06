import {assetResponse,fileName} from './assets';
async function run(){
 const path=new URLSearchParams(location.search).get('file')||'';
 if(!/^\/data\/[a-zA-Z0-9_./-]+\.(json|geojson)$/.test(path)||path.includes('..'))throw Error('Ungültiger Dateipfad.');
 const response=await assetResponse(path);if(!response.ok)throw Error('Die Datei ist in dieser Ausgabe nicht verfügbar.');
 const link=document.getElementById('download') as HTMLAnchorElement;link.href=URL.createObjectURL(await response.blob());link.download=fileName(path);link.hidden=false;link.textContent=fileName(path)+' speichern';document.getElementById('status')!.textContent='Die Datei ist vollständig entpackt und kann gespeichert werden.';link.click();
}
void run().catch(error=>{document.getElementById('status')!.textContent=error.message;});
