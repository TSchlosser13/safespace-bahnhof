import type {Feature} from './types';
const R=6371008.8,rad=Math.PI/180;
export function haversine(a:number[],b:number[]){const dl=(b[0]-a[0])*rad,dp=(b[1]-a[1])*rad;return 2*R*Math.asin(Math.min(1,Math.sqrt(Math.sin(dp/2)**2+Math.cos(a[1]*rad)*Math.cos(b[1]*rad)*Math.sin(dl/2)**2)));}
export function projectLocal(p:number[],origin:number[]):[number,number]{const d=haversine(origin,p);const dl=(p[0]-origin[0])*rad;const y=Math.sin(dl)*Math.cos(p[1]*rad),x=Math.cos(origin[1]*rad)*Math.sin(p[1]*rad)-Math.sin(origin[1]*rad)*Math.cos(p[1]*rad)*Math.cos(dl);const a=Math.atan2(y,x);return [d*Math.sin(a),d*Math.cos(a)];}
export function bufferAreaKm2(radius:number){if(!Number.isFinite(radius)||radius<=0)throw new Error('Invalid radius');return Math.PI*radius*radius/1e6;}
function segmentDistance(a:number[],b:number[]){const dx=b[0]-a[0],dy=b[1]-a[1],den=dx*dx+dy*dy,t=den?Math.max(0,Math.min(1,-(a[0]*dx+a[1]*dy)/den)):0;return Math.hypot(a[0]+t*dx,a[1]+t*dy);}
function insideRing(p:number[],ring:number[][]){let inside=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[i],b=ring[j];if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])inside=!inside;}return inside;}
export function touchesBuffer(f:Feature,origin:number[],radius:number){const g=f.geometry;if(g.type==='Point')return haversine(origin,g.coordinates)<=radius;
 const lines:number[][][]=g.type==='LineString'?[g.coordinates]:g.type==='Polygon'?g.coordinates:g.type==='MultiLineString'?g.coordinates:g.type==='MultiPolygon'?g.coordinates.flat():[];
 const polygons=g.type==='Polygon'?[g.coordinates]:g.type==='MultiPolygon'?g.coordinates:[];if(polygons.some((poly:number[][][])=>insideRing(origin,poly[0])&&!poly.slice(1).some(r=>insideRing(origin,r))))return true;
 return lines.some(line=>{const pts=line.map(p=>projectLocal(p,origin));return pts.some(p=>Math.hypot(...p)<=radius)||pts.some((p,i)=>i>0&&segmentDistance(pts[i-1],p)<=radius);});
}
export function deduplicate<T extends {id:string}>(items:T[]){return [...new Map(items.map(x=>[x.id,x])).values()];}
export function osmFeatures(elements:any[]):Feature[]{const features:Feature[]=[];for(const e of elements){if(!['node','way','relation'].includes(e.type)||!Number.isSafeInteger(e.id))continue;const id=e.type+'/'+e.id;let geometry:Feature['geometry']|null=null;
 if(e.type==='node'&&Number.isFinite(e.lon)&&Number.isFinite(e.lat))geometry={type:'Point',coordinates:[e.lon,e.lat]};
 if(e.type==='way'&&Array.isArray(e.geometry)&&e.geometry.length>1){const coords=e.geometry.map((p:any)=>[p.lon,p.lat]);if(coords.every((p:number[])=>p.every(Number.isFinite))){const closed=!!e.nodes?.length&&e.nodes[0]===e.nodes.at(-1);const area=closed&&e.tags?.area!=='no'&&(e.tags?.area==='yes'||!!e.tags?.building||!!e.tags?.shop||!!e.tags?.amenity||e.tags?.railway==='platform');geometry={type:area?'Polygon':'LineString',coordinates:area?[coords]:coords};}}
 if(geometry)features.push({type:'Feature',id,geometry,properties:{...e.tags,osm_type:e.type,osm_id:e.id,source_record_id:id,source_url:'https://www.openstreetmap.org/'+id,licence:'ODbL-1.0',quality_flags:['mapping_completeness_unknown','possible_cross_representation_duplicates']}});}
 return deduplicate(features);
}
export function bufferGeometry(origin:number[],radius:number){const coords=[];for(let i=0;i<=64;i++){const a=2*Math.PI*i/64,phi=origin[1]*rad,lam=origin[0]*rad,d=radius/R;const lat=Math.asin(Math.sin(phi)*Math.cos(d)+Math.cos(phi)*Math.sin(d)*Math.cos(a)),lon=lam+Math.atan2(Math.sin(a)*Math.sin(d)*Math.cos(phi),Math.cos(d)-Math.sin(phi)*Math.sin(lat));coords.push([lon/rad,lat/rad]);}return {type:'Polygon',coordinates:[coords]};}

