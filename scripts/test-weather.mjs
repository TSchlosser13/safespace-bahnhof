import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {readFile,writeFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {join} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const root=fileURLToPath(new URL('..',import.meta.url));
await build({entryPoints:[join(root,'source/pages/weather.ts')],bundle:true,format:'esm',platform:'node',outfile:join(root,'.cache/weather-test.mjs'),alias:{'@':join(root,'source')},logLevel:'silent'});
const originalFetch=globalThis.fetch;globalThis.location=new URL('http://127.0.0.1:5175/safespace-bahnhof/');globalThis.fetch=(input,init)=>originalFetch(new URL(input,globalThis.location),init);
const {weatherQuery}=await import(pathToFileURL(join(root,'.cache/weather-test.mjs')).href);
const boot=JSON.parse(gunzipSync(await readFile(join(root,'site/data/pages-bootstrap.json.gz'))));
const fixtures=[
 ['db:1040','2026-08-31','00:00','24:00'],
 ['db:1040','2024-01-01','00:00','24:00'],
 ['db:1040','2024-03-31','00:00','24:00'],
 ['db:1040','2024-10-27','02:00','04:00'],
 ['db:2514','2025-07-11','22:30','03:15'],
 ['db:1866','2026-08-08','12:00','14:00'],
 ['db:1','2025-12-11','05:15','07:45'],
 ['db:7263','2026-08-20','00:00','24:00'],
];
const results=[];
for(const [station,date,start,end] of fixtures){
 assert(boot.stations.some(s=>s.id===station),'Test station is in the catalogue');
 const query=new URLSearchParams({station,date,start,end}),before=performance.now();
 const expectedResponse=await originalFetch('http://127.0.0.1:5174/weather?'+query);assert.equal(expectedResponse.status,200);
 const expected=await expectedResponse.json(),actual=await weatherQuery(query,boot);
 assert.deepEqual(actual,expected,station+' '+date+' '+start+'–'+end);
 results.push({station,date,start,end,products:actual.products.length,rows:actual.products.reduce((n,p)=>n+p.rows.length,0),exactResponseMatch:true,milliseconds:Math.round(performance.now()-before)});
 console.log(JSON.stringify(results.at(-1)));
}
for(const [date,start,end] of [['2023-12-31','00:00','24:00'],['2026-09-01','00:00','24:00'],['2026-08-31','23:00','01:00'],['2024-03-31','02:30','04:00']]){
 await assert.rejects(weatherQuery(new URLSearchParams({station:'db:1040',date,start,end}),boot));
 results.push({date,start,end,rejectedInvalidWindow:true});
}
await writeFile(join(root,'audit/weather-parity.json'),JSON.stringify({verifiedAt:new Date().toISOString(),results},null,2)+'\n');
console.log('Weather parity and boundary checks passed.');
