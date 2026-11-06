"""Lossless static package. All output paths stay inside this standalone site/."""
from pathlib import Path
import argparse,csv,gzip,hashlib,io,json,shutil,zipfile,os,concurrent.futures,time
from datetime import datetime,timezone
HERE=Path(__file__).resolve().parents[1];ROOT=HERE.parent;OUT=HERE/'site';EPOCH=datetime(1970,1,1)
def rawjson(value):return json.dumps(value,ensure_ascii=False,separators=(',',':')).encode('utf-8')
def save(path,raw,compress=False):
 path.parent.mkdir(parents=True,exist_ok=True)
 payload=gzip.compress(raw,compresslevel=9,mtime=0) if compress else raw
 path.write_bytes(payload)
 return len(payload)
def prune_previous(audit_file,current):
 if not audit_file.exists():return
 old=json.loads(audit_file.read_text(encoding='utf-8'));keep={r['path'] for r in current}
 for entry in old:
  if entry['path'] in keep:continue
  target=(OUT/entry['path']).resolve()
  if not target.is_relative_to(OUT.resolve()) or target==OUT.resolve():raise ValueError('Unsafe stale artifact path')
  if target.is_file():target.unlink()
def copy_public(path):
 rel=path.relative_to(ROOT/'public');raw=path.read_bytes();compressed=path.suffix in ('.json','.geojson')
 dest=OUT/rel
 if compressed:dest=Path(str(dest)+'.gz')
 size=save(dest,raw,compressed)
 return {'path':dest.relative_to(OUT).as_posix(),'decodedPath':'/'+rel.as_posix(),'bytes':size,'decodedBytes':len(raw),'decodedSha256':hashlib.sha256(raw).hexdigest()}
def meta_rows(raw):
 text=raw.decode('cp1252').replace('\r\r\n','\n')
 return [{(k or '').strip():(v or '').strip() for k,v in r.items() if k and isinstance(v,str)} for r in csv.DictReader(io.StringIO(text),delimiter=';') if str(next(iter(r.values()),'')).strip().isdigit()]
def native_minute(value):
 if not isinstance(value,str):raise ValueError('not a timestamp')
 if len(value)==10 and value.isdigit():fmt=10;minute='00'
 elif len(value)==13 and value[10]==':' and (value[:10]+value[11:]).isdigit():fmt=13;minute=value[11:]
 else:raise ValueError('nonstandard timestamp')
 stamp=datetime.fromisoformat(f'{value[:4]}-{value[4:6]}-{value[6:8]}T{value[8:10]}:{minute}')
 return int((stamp-EPOCH).total_seconds()//60),fmt
def encode_time(values):
 try:
  converted=[native_minute(v) for v in values]
  if not converted or len({fmt for _,fmt in converted})!=1:return None
  stamps=[v for v,_ in converted];deltas=[b-a for a,b in zip(stamps,stamps[1:])]
  # Roundtrip every original string, including native leading zeros and minute precision.
  for original,stamp in zip(values,stamps):
   date=datetime.fromtimestamp(stamp*60,timezone.utc)
   restored=f'{date.year:04d}{date.month:02d}{date.day:02d}{date.hour:02d}'+(f':{date.minute:02d}' if converted[0][1]==13 else '')
   if original!=restored:return None
  result={'first':values[0]}
  if len(set(deltas))<=1:result['step']=deltas[0] if deltas else 0
  else:result['deltas']=deltas
  return result
 except (ValueError,OverflowError,TypeError):return None
def pack_archive(job):
 product,sid,ar=job;path=(ROOT/ar['localPath']).resolve()
 if not path.is_relative_to(ROOT/'.data'):raise ValueError(f'Archive outside source directory: {path}')
 raw=path.read_bytes();sha=hashlib.sha256(raw).hexdigest()
 if ar.get('sha256')!=sha:raise ValueError(f'Archive hash changed: {path}')
 packed={'schemaVersion':'dwd-columnar-archive/1','sourceSha256':sha,'parameter_metadata':[],'members':[]};total=0
 with zipfile.ZipFile(io.BytesIO(raw)) as z:
  for name in z.namelist():
   if name.startswith('Metadaten_Parameter') and name.endswith('.txt'):packed['parameter_metadata']+=meta_rows(z.read(name))
  for member in ar['dataFiles']:
   columns={};count=0
   reader=csv.DictReader(io.StringIO(z.read(member['name']).decode('cp1252')),delimiter=';')
   for r in reader:
    row={k.strip():v.strip() for k,v in r.items() if k and isinstance(v,str)}
    for k in row:
     if k not in columns:columns[k]=[None]*count
    for k,values in columns.items():values.append(row.get(k))
    count+=1
   item={'name':member['name'],'count':count,'constants':{},'columns':{},'times':{}}
   for key,values in columns.items():
    if values and all(v==values[0] for v in values):item['constants'][key]=values[0]
    elif key in ('MESS_DATUM','MESS_DATUM_WOZ') and (times:=encode_time(values)) is not None:item['times'][key]=times
    else:item['columns'][key]=values
   # Each native field is either unchanged, an exact constant, or roundtripped above.
   packed['members'].append(item);total+=count
 dest=OUT/'data/weather-packed'/f'{sha}.json.gz';size=save(dest,rawjson(packed),True)
 return {'product':product,'stationId':sid,'sourceId':ar['id'],'sourceSha256':sha,'path':dest.relative_to(OUT).as_posix(),'bytes':size,'rows':total,'members':len(packed['members'])}
def main():
 parser=argparse.ArgumentParser();parser.add_argument('--public-only',action='store_true');parser.add_argument('--weather-only',action='store_true');args=parser.parse_args()
 OUT.mkdir(parents=True,exist_ok=True);audit=HERE/'audit';audit.mkdir(exist_ok=True)
 if not args.weather_only:
  files=sorted(p for p in (ROOT/'public').rglob('*') if p.is_file())
  with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:records=list(pool.map(copy_public,files))
  prune_previous(audit/'public-files.json',records)
  save(audit/'public-files.json',rawjson(records));print(json.dumps({'publicFiles':len(records),'bytes':sum(r['bytes'] for r in records)}),flush=True)
 if not args.public_only:
  index=json.loads((ROOT/'.data/integration/weather-index.json').read_text(encoding='utf-8-sig'));jobs=[]
  for product,info in index['products'].items():
   for sid,station in info['stations'].items():
    for ar in station['archives']:
     jobs.append((product,sid,ar));ar['packedPath']='/data/weather-packed/'+ar['sha256']+'.json'
  records=[];started=time.time()
  with concurrent.futures.ProcessPoolExecutor(max_workers=min(8,os.cpu_count() or 4)) as pool:
   for i,record in enumerate(pool.map(pack_archive,jobs,chunksize=6),1):
    records.append(record)
    if i%1000==0:print(json.dumps({'weatherArchives':i,'of':len(jobs),'elapsedSeconds':round(time.time()-started)}),flush=True)
  expected=index['retention']['currentTotals']['records'];actual=sum(r['rows'] for r in records)
  if expected!=actual:raise ValueError(f'Weather row count {actual} differs from retained index {expected}')
  save(OUT/'data/weather-packed/index.json.gz',rawjson(index),True)
  prune_previous(audit/'weather-files.json',records)
  save(audit/'weather-files.json',rawjson(records))
  print(json.dumps({'weatherArchives':len(records),'nativeRows':actual,'bytes':sum(r['bytes'] for r in records)}),flush=True)
if __name__=='__main__':main()
