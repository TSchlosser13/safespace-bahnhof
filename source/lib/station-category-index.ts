/** Exact dated OpenStation station categories. Never substitute price categories. */
type CategoryIndex = {
  schemaVersion: string;
  sourceField: string;
  provenance: {sourceSha256: string; publicationTime: string};
  stationCount: number;
  categoriesByStation: Record<string, string | null>;
};
type CategoryCatalogue = {
  provenance: {source_sha256: string; publication_time: string};
  stations: {id: string}[];
};

export function matchingStationCategories(index: CategoryIndex, catalogue: CategoryCatalogue): Record<string, string | null> {
  if(index.schemaVersion !== 'openstation-station-categories/1.0.0'
    || index.sourceField !== 'StopPlace/keyList/DBINFRAGO_STATION_CATEGORY'
    || index.provenance.sourceSha256 !== catalogue.provenance.source_sha256
    || index.provenance.publicationTime !== catalogue.provenance.publication_time
    || index.stationCount !== catalogue.stations.length) return {};
  const entries = index.categoriesByStation;
  if(Object.keys(entries).length !== catalogue.stations.length
    || catalogue.stations.some(station => !Object.hasOwn(entries, station.id))) return {};
  return Object.fromEntries(catalogue.stations.map(station => {
    const value = entries[station.id];
    return [station.id, typeof value === 'string' && /^[1-7]$/.test(value) ? value : null];
  }));
}
