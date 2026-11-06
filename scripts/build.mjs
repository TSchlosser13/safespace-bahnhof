import {build as bundle} from 'esbuild';
import {build as viteBuild} from 'vite';
import {mkdir,readFile,writeFile,readdir,unlink} from 'node:fs/promises';
import {gzipSync,gunzipSync} from 'node:zlib';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {join,resolve,sep} from 'node:path';
import {createHash} from 'node:crypto';
import {verify} from './verify.mjs';
const root=fileURLToPath(new URL('..',import.meta.url)),site=join(root,'site');
await mkdir(join(root,'.cache'),{recursive:true});
// Validate the output boundary before removing stale generated JS/CSS assets.
const assets=resolve(site,'assets');if(!assets.startsWith(resolve(site)+sep))throw Error('Unsafe asset path');
try{for(const entry of await readdir(assets,{withFileTypes:true})){if(entry.isFile())await unlink(join(assets,entry.name));else throw Error('Unexpected nested asset directory');}}catch(error){if(error.code!=='ENOENT')throw error;}
await bundle({entryPoints:[join(root,'scripts/bootstrap-entry.ts')],bundle:true,platform:'node',format:'esm',outfile:join(root,'.cache/bootstrap.mjs'),alias:{'@':join(root,'source')},logLevel:'silent'});
const {bootstrap}=await import(pathToFileURL(join(root,'.cache/bootstrap.mjs')).href+'?'+Date.now());
const locations=JSON.parse(gunzipSync(await readFile(join(site,'data/station-locations.json.gz'))));
const boot=bootstrap(locations);
const writeJson=async(path,value)=>{await mkdir(join(site,'data'),{recursive:true});await writeFile(join(site,path),gzipSync(Buffer.from(JSON.stringify(value)),{level:9,mtime:0}));};
await writeJson('data/pages-bootstrap.json.gz',boot);
const inventory=JSON.parse(await readFile(join(root,'source/data/retrieval-overview.json'),'utf8'));
const history=inventory.sources.map(source=>({id:'published-'+source.sourceId,source:source.name,station_id:'Deutschland',status:source.fileCount?'success':'unavailable',created_at:source.retrievedAt??inventory.generatedAt,details:JSON.stringify({scope:'published_source_inventory',inventoryUrl:source.inventoryUrl,sourceFiles:source.fileCount,preparedFiles:source.preparedFileCount,datasets:source.datasets,missing:source.missing})}));
await writeJson('data/pages-history.json.gz',history);
await viteBuild({configFile:join(root,'vite.config.mjs')});
await writeFile(join(site,'.nojekyll'),'');
if(process.argv.includes('--frontend-only')){console.log('Frontend built; data packaging is separate.');process.exit(0);}
const weather=JSON.parse(await readFile(join(root,'audit/weather-files.json'),'utf8'));
const publicFiles=JSON.parse(await readFile(join(root,'audit/public-files.json'),'utf8'));
const manifest={schemaVersion:'safespace-pages-build/1',builtAt:new Date().toISOString(),target:'https://tschlosser13.github.io/safespace-bahnhof/',basePath:'/safespace-bahnhof/',stations:boot.stations.length,initialStation:'db:1040',observationPeriod:{start:'2024-01-01',end:'2026-08-31'},timetablePeriod:{start:'2026-08-01',end:'2026-08-31'},referencePolicy:'Latest accessible reference versions; their source dates are retained separately.',publicData:{files:publicFiles.length,decodedBytes:publicFiles.reduce((n,r)=>n+r.decodedBytes,0),packagedBytes:publicFiles.reduce((n,r)=>n+r.bytes,0),compression:'Gzip; original decoded bytes and SHA-256 unchanged'},weather:{products:15,archives:weather.length,records:weather.reduce((n,r)=>n+r.rows,0),packagedArchiveBytes:weather.reduce((n,r)=>n+r.bytes,0),method:'Per original archive: all native strings, parameter metadata and member order preserved. Constant columns and exactly reversible native timestamp deltas. No deduplication during packaging.'},runtime:{backend:'none',weatherQuery:'browser; same dated nearest-station and archive-priority method as local service',osm:'published snapshots for 250/500/1000 m; no live Overpass retrieval',facilityStatus:'published SIRI snapshot; no live refresh',mapTiles:'external OSM tile requests with visible attribution',persistence:'no selected-station storage'},sizeUnit:'MB = 1,000,000 bytes',verification:'data/pages-file-manifest.json.gz'};
await writeJson('data/pages-build.json.gz',manifest);
// A SHA-256 manifest supports checks after copying/uploading the static artifact.
async function walk(dir){const out=[];for(const entry of await readdir(dir,{withFileTypes:true})){const path=join(dir,entry.name);if(entry.isDirectory())out.push(...await walk(path));else if(entry.isFile())out.push(path);else throw Error('Unsupported artifact entry: '+path);}return out;}
const files=[];for(const path of await walk(site)){const relative=path.slice(site.length+1).replaceAll('\\','/');if(relative==='data/pages-file-manifest.json.gz')continue;const raw=await readFile(path);files.push({path:relative,bytes:raw.length,sha256:createHash('sha256').update(raw).digest('hex')});}
await writeJson('data/pages-file-manifest.json.gz',{schemaVersion:'pages-file-manifest/1',files});
const result=await verify(root);await writeFile(join(root,'audit/build-verification.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
