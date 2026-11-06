import {readdir,lstat,readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
export async function verify(root=fileURLToPath(new URL('..',import.meta.url))){
 const site=join(root,'site');let bytes=0,count=0,largest=0;
 async function walk(dir){for(const entry of await readdir(dir)){const path=join(dir,entry),stat=await lstat(path);if(stat.isSymbolicLink()||stat.nlink>1&&!stat.isDirectory())throw Error('Linked files are not allowed in a Pages artifact: '+path);if(stat.isDirectory())await walk(path);else{count++;bytes+=stat.size;largest=Math.max(largest,stat.size);}}}
 await walk(site);if(bytes>=1_000_000_000)throw Error('Artifact exceeds the conservative 1 GB Pages limit: '+bytes);if(largest>=100_000_000)throw Error('File exceeds repository size limit');
 const manifest=JSON.parse(gunzipSync(await readFile(join(site,'data/pages-file-manifest.json.gz'))));
 for(const item of manifest.files){const raw=await readFile(join(site,...item.path.split('/')));if(raw.length!==item.bytes||createHash('sha256').update(raw).digest('hex')!==item.sha256)throw Error('Artifact checksum mismatch: '+item.path);}
 for(const html of ['index.html','download.html']){const text=await readFile(join(site,html),'utf8');if(/(?:src|href)="\/(?!safespace-bahnhof\/)/.test(text))throw Error('Root-relative asset in '+html);}
 await lstat(join(site,'.nojekyll'));
 return {verifiedAt:new Date().toISOString(),target:'https://tschlosser13.github.io/safespace-bahnhof/',files:count,bytes,decimalMB:Number((bytes/1_000_000).toFixed(3)),largestFileBytes:largest,verifiedChecksums:manifest.files.length,linkedFiles:0,limitBytes:1_000_000_000};
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1])console.log(JSON.stringify(await verify(),null,2));
