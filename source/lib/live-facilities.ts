/** Current SIRI observations; deliberately independent of the historical study window. */
export type LiveFacilityRecord = {
  recordId: string;
  facilityRef: string | null;
  status: 'available' | 'notAvailable' | 'unknown' | 'other';
  statusRaw: string | null;
  description: string | null;
  descriptions: { text: string; language: string | null }[];
  recordedAtTime: string | null;
  validUntilTime: string | null;
  stationId: string | null;
  equipmentType: string | null;
  name: string | null;
  match: 'exact' | 'unmatched' | 'ambiguous';
  qualityFlags: string[];
};
export type LiveFacilitySnapshot = {
  schemaVersion: 'openstation-siri-live/1.0';
  availability: 'present' | 'unavailable';
  scope: 'current_status_outside_historical_analysis';
  source: {
    name: string; url: string; resolvedUrl: string; licence: string;
    responseTimestamp: string; retrievedAt: string; sha256: string;
    rawPath: string; bytes: number; compressed: boolean;
  } | null;
  catalogue: { sha256: string; publicationTime: string | null; stations: number; equipment: number } | null;
  summary: {
    records: number; uniqueFacilityRefs: number; matchedRecords: number;
    unmatchedRecords: number; ambiguousRecords: number; stationsWithStatus: number;
    duplicateFacilityRefs: number; statusCounts: Record<string, number>;
  };
  stations: Record<string, LiveFacilityRecord[]>;
  unmatchedRecords: LiveFacilityRecord[];
  lastRefresh: { attemptedAt: string; succeeded: boolean; error: string | null } | null;
  refreshIntervalSeconds: number;
  qualityFlags: string[];
};
