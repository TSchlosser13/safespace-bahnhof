import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {join,resolve,sep,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
const site=resolve(fileURLToPath(new URL('../site',import.meta.url))),base='/safespace-bahnhof/',port=Number(process.env.PORT||5175);
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.json':'application/json','.pdf':'application/pdf','.gz':'application/gzip','.png':'image/png','.jpg':'image/jpeg'};
createServer(async(req,res)=>{try{
 const url=new URL(req.url,'http://localhost');if(url.pathname==='/'){res.writeHead(302,{Location:base});return res.end();}if(!url.pathname.startsWith(base)){res.writeHead(404);return res.end('Not found');}
 const rel=decodeURIComponent(url.pathname.slice(base.length)),path=resolve(site,rel||'index.html');if(!path.startsWith(site+sep)){res.writeHead(403);return res.end();}
 const info=await stat(path);if(!info.isFile()){res.writeHead(404);return res.end();}res.writeHead(200,{'Content-Type':types[extname(path)]||'application/octet-stream','Content-Length':info.size,'Cache-Control':'no-cache'});if(req.method==='HEAD')return res.end();res.end(await readFile(path));
 }catch{res.writeHead(404);res.end('Not found');}}).listen(port,'127.0.0.1',()=>console.log('Static Pages preview: http://127.0.0.1:'+port+base));
