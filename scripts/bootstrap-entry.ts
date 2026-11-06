import snapshot from '../source/data/catalogue-snapshot.json';
import categoryIndex from '../source/data/integration/station-categories.json';
import {matchingStationCategories} from '../source/lib/station-category-index';
import {catalogue} from '../source/lib/catalogue';
import {sources} from '../source/lib/sources';
export function bootstrap(cartography:any){
 const categories=matchingStationCategories(categoryIndex,snapshot);
 const stations=snapshot.stations.map(s=>({...s,station_category:categories[s.id]??null,map_locations:cartography.stations[s.id]?.locations??[]}));
 const examples:string[]=[],states=new Set<string>();for(const s of stations){if(s.map_anchor&&s.platform_count<=3&&!states.has(s.state)){examples.push(s.id);states.add(s.state);}if(examples.length===8)break;}
 return {stations,catalogue,sources,provenance:snapshot.provenance,location_sources:cartography.sources,examples};
}
