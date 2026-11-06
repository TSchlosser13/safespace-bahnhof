import {integratedIds,integratedValues,type IntegratedContext} from './integration';
import {catalogue} from './catalogue';
import {bufferAreaKm2,deduplicate} from './geo';
import type {Value,Profile,Enrichment,Indicator} from './types';
export const predicates:Record<string,(tags:any)=>boolean>={
 amenities:t=>!!t.shop&&t.shop!=='no'||['restaurant','cafe','fast_food'].includes(t.amenity),
 lights:t=>t.highway==='street_lamp'||t.man_made==='street_lamp',
 seating:t=>t.amenity==='bench',bicycle_parking:t=>t.amenity==='bicycle_parking',
 footways:t=>['footway','pedestrian','path','steps'].includes(t.highway),
 underpasses:t=>['yes','building_passage'].includes(t.tunnel)&&['footway','pedestrian','path','steps'].includes(t.highway)};
const eq:Record<string,string>={stairs:'StaircaseEquipment',ramps:'RampEquipment',lifts:'LiftEquipment',shelters:'ShelterEquipment',toilets:'SanitaryEquipment'};
export function calculate(profile:Profile,selected:string[],radius:number,osm?:Enrichment|null,sourceUnavailable=false,context?:IntegratedContext):Value[]{const p=profile.provenance,s=profile.station;
 const base=(i:Indicator):Value=>({station_id:s.id,subarea_id:null,study_session_id:null,indicator_id:i.id,value:null,unit:i.unit,availability:'unknown',source_type:'official',source_format:'NeTEx XML',derivation_method:'documented_count',source_record_ids:[],source_url:p.source_url,reference_period:p.publication_time,retrieved_at:p.retrieved_at,method_version:i.method_version,quality_flags:[],licence:p.licence,source_sha256:p.source_sha256,spatial_scope:'station:'+s.source_id,denominator:null});
 return selected.flatMap(id=>{const i=catalogue.find(x=>x.id===id);if(!i)return [];const v=base(i);
 if(integratedIds.has(id))return integratedValues(profile,i,radius,context,v);
 if(!i.implemented){return [{...v,availability:'not_collected',source_type:i.category==='situational'?'researcher_observation':i.category==='subjective'?'participant_report':'unconfigured',derivation_method:'not_computed',source_url:null,reference_period:null,retrieved_at:null,licence:null,source_sha256:null,quality_flags:['required_source_not_imported']} as Value];}
 if(id==='platform_length'){const edges=deduplicate(profile.quays.filter(q=>q.type==='railPlatform'));if(!edges.length)return [v];return edges.map(q=>({...v,subarea_id:q.id,value:q.length,availability:q.length===null?'unknown':'present',derivation_method:'source_value',source_record_ids:[q.id],spatial_scope:'platform_edge:'+q.id,quality_flags:q.length===null?['missing_source_field']:['edge_length_not_full_platform_length']} as Value));}
 if(id==='platform_count'){v.source_record_ids=deduplicate(profile.quays.filter(q=>q.type==='railIslandPlatform')).map(q=>q.id);}
 else if(id==='entrances'){v.source_record_ids=deduplicate(profile.entrances.filter(e=>!e.station_ref||e.station_ref===s.source_id)).map(e=>e.id);}
 else if(eq[id]){v.source_record_ids=deduplicate(profile.equipment.filter(e=>e.type===eq[id])).map(e=>e.id);}
 else {v.source_type='community';v.source_format=osm?.source_format??'Overpass JSON';v.derivation_method=id==='amenity_density'?'spatial_density':'spatial_count';v.spatial_scope='buffer:'+radius+'m;anchor:'+s.anchor_record_id;v.source_url=osm?.source_url??null;v.licence=osm?.licence??null;v.source_sha256=osm?.source_sha256??null;v.retrieved_at=osm?.retrieved_at??null;v.reference_period=osm?.reference_period??null;
 if(!s.map_anchor){v.availability='outside_coverage';v.quality_flags=['no_verified_analysis_anchor'];return [v];}
 if(!osm||osm.radius!==radius||osm.station_id!==s.id||osm.anchor_record_id!==s.anchor_record_id||JSON.stringify(osm.anchor_coordinates)!==JSON.stringify(s.map_anchor)||osm.anchor_method_version!=='buffer-intersection/1.0.0'){v.availability=sourceUnavailable?'temporarily_unavailable':'not_collected';v.source_url=null;v.licence=null;v.source_sha256=null;v.retrieved_at=null;v.reference_period=null;v.quality_flags=[sourceUnavailable?'cache_read_failed':'no_successful_query_for_selected_scope'];return [v];}
 if(osm.coverage_status==='partial_extract')v.quality_flags.push('partial_geographic_extract');
 if(osm.derivation_method)v.derivation_method=osm.derivation_method+(id==='amenity_density'?'/density':'/count');
 const predicate=predicates[id==='amenity_density'?'amenities':id];v.source_record_ids=osm.features.filter(f=>predicate?.(f.properties)).map(f=>f.id);v.value=id==='amenity_density'?v.source_record_ids.length/bufferAreaKm2(radius):v.source_record_ids.length;v.denominator=id==='amenity_density'?bufferAreaKm2(radius):null;v.availability='present';v.quality_flags=['mapped_records_not_physical_absence','mapping_completeness_unknown','possible_cross_representation_duplicates','equipment_reference_point',...(osm.excluded_record_ids?.length?['unsupported_relations_excluded']:[]),...(osm.quality_flags??[])];return [v];}
 if(v.source_record_ids.length){v.value=v.source_record_ids.length;v.availability='present';}v.quality_flags=['inventory_completeness_unknown'];return [v];
 });
}
export function compatibility(values:Value[]){const warnings:string[]=[];if(new Set(values.map(v=>v.method_version)).size>1)warnings.push('Unterschiedliche Methodenversionen.');if(new Set(values.map(v=>v.reference_period)).size>1)warnings.push('Unterschiedliche Quelldatenstände.');if(new Set(values.map(v=>v.spatial_scope.replace(/;anchor:.*/,'').replace(/station:.*/,'station').replace(/platform_edge:.*/,'platform_edge'))).size>1)warnings.push('Unterschiedliche räumliche Definitionen.');return warnings;}

