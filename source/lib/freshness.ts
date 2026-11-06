import overview from '@/data/freshness-overview.json';
export const freshness=overview;
export type SourceFreshness={sourceId:string;status:string;statusLabel:string;checkedAt:string|null;referenceLabel:string;summary:string;gaps:string[];evidenceUrl:string|null};
export const sourceFreshness=freshness.sources as Record<string,SourceFreshness>;
export const shortDate=(value:string|null|undefined)=>value?value.slice(0,10).split('-').reverse().join('.'):'nicht verfügbar';
