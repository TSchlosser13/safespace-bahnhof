import type {Station,Enrichment} from './types';
export type Position=[number,number];
export type MapLocation={id:string;coordinates:Position;source_id:string;source_record_id:string;source_url:string;name:string;matching_fields:{field:string;value:string}[];quality_flags:string[];eligible:boolean;coordinate_meaning:string};
export type LocationSource={provider:string;retrievedAt:string;sha256:string;licenseUrl:string;downloadUrl?:string;endpoint?:string;sourceLastCommitAt?:string;osmBaseTimestamp?:string};
export function displayLocations(s:Station):MapLocation[]{return (s.map_locations??[]).filter(x=>x.eligible);}
export function overviewPositions(s:Station):Position[]{if(s.map_anchor)return [s.map_anchor];const seen=new Set<string>();return displayLocations(s).flatMap(x=>{const key=x.coordinates.join(',');if(seen.has(key))return [];seen.add(key);return [x.coordinates];});}
export function compatibleSnapshot(s:Station|undefined|null,radius:number,osm:Enrichment|undefined|null){return !!s&&!!osm&&osm.station_id===s.id&&osm.radius===radius&&osm.anchor_record_id===s.anchor_record_id&&JSON.stringify(osm.anchor_coordinates)===JSON.stringify(s.map_anchor)&&osm.anchor_method_version==='buffer-intersection/1.0.0';}
export const MAP_WIDTH=760,MAP_HEIGHT=590;
export type Viewport={zoom:number;pan:Position};
export function zoomAt(view:Viewport,point:Position,factor:number,limits={min:.5,max:16}):Viewport{
 const zoom=Math.max(limits.min,Math.min(limits.max,view.zoom*factor)),k=zoom/view.zoom;
 return {zoom,pan:[point[0]-MAP_WIDTH/2-k*(point[0]-MAP_WIDTH/2-view.pan[0]),point[1]-MAP_HEIGHT/2-k*(point[1]-MAP_HEIGHT/2-view.pan[1])]};
}
export function worldPosition(p:Position):Position{return [(p[0]+180)/360,(1-Math.asinh(Math.tan(Math.max(-85,Math.min(85,p[1]))*Math.PI/180))/Math.PI)/2];}
