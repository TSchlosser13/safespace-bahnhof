/** Supplementary static NeTEx inventory. Values describe the dated source, not live conditions. */
export type OpenStationRawNode = {
  tag: string;
  /** Omitted for the default NeTEx namespace. */
  namespace?: string;
  attributes?: Record<string, string>;
  text?: string;
  tail?: string;
  children?: OpenStationRawNode[];
};
export type OpenStationName = { language: string | null; text: string };
export type OpenStationReference = { path: string; ref: string; attributes: Record<string, string> };
export type OpenStationRecord = {
  id: string | null;
  type: string;
  name: string | null;
  names: OpenStationName[];
  /** Exact direct scalar source values; no numeric, boolean or unit conversion. */
  fields: Record<string, string>;
  references: OpenStationReference[];
  raw: OpenStationRawNode;
  parentOrganisationRef?: string | null;
};
export type OpenStationAccessibilityFlag =
  | 'MobilityImpairedAccess' | 'WheelchairAccess' | 'StepFreeAccess' | 'StairFreeAccess'
  | 'EscalatorFreeAccess' | 'LiftFreeAccess' | 'RampFreeAccess' | 'LevelAccessIntoVehicle'
  | 'AudibleSignalsAvailable' | 'VisualSignsAvailable' | 'TactileGuidanceAvailable' | 'GuideDogAccess';
export type OpenStationAccessibilityValue = 'true' | 'false' | 'partial' | 'unknown' | (string & {});
export type OpenStationAccessibility = {
  id: string | null;
  flags: Record<OpenStationAccessibilityFlag, OpenStationAccessibilityValue | null>;
  raw: OpenStationRawNode;
};
export type OpenStationPlace = OpenStationRecord & {
  accessibility: OpenStationAccessibility | null;
  equipmentPlaceRefs: string[];
};
export type OpenStationEquipment = OpenStationRecord & {
  passengerInformationTypeRef: string | null;
  location: 'placeEquipments' | 'unlocalisedEquipments';
  equipmentPlaceRefs: string[];
  pathRefs: string[];
};
export type OpenStationPath = OpenStationRecord & {
  from: string | null;
  to: string | null;
  equipmentRefs: string[];
  accessibility: OpenStationAccessibility | null;
};
export type OpenStationSchedule = {
  name: string | null;
  daysOfWeek: string | null;
  holidaysOnly: string | null;
  timebands: { start: string | null; end: string | null }[];
  raw: OpenStationRawNode;
};
export type OpenStationAssistance = OpenStationRecord & { schedules: OpenStationSchedule[] };
export type OpenStationDetailsProvenance = {
  sourceUrl: string;
  resolvedUrl: string | null;
  sourceSha256: string;
  publicationTime: string;
  retrievedAt: string;
  licence: string;
  methodVersion: string;
};
export type OpenStationDetails = {
  schemaVersion: 'openstation-details/1.0.0';
  stationId: string;
  stada: string;
  sourceId: string;
  provenance: OpenStationDetailsProvenance;
  station: OpenStationRecord & {
    stationCategory: string | null;
    priceCategory: string | null;
    accessibility: OpenStationAccessibility | null;
  };
  quays: OpenStationPlace[];
  accessSpaces: OpenStationPlace[];
  entrances: OpenStationPlace[];
  equipment: OpenStationEquipment[];
  equipmentPlaces: OpenStationRecord[];
  paths: OpenStationPath[];
  assistanceServices: OpenStationAssistance[];
  levels: OpenStationRecord[];
  responsibility: {
    setRef: string | null;
    set: OpenStationRecord | null;
    organisations: OpenStationRecord[];
    unresolvedOrganisationRefs: string[];
  };
  qualityFlags: string[];
};
export type OpenStationDetailsManifest = {
  schemaVersion: 'openstation-details/1.0.0';
  sourceId: 'openstation';
  provenance: OpenStationDetailsProvenance;
  generatedAt: string;
  stations: number;
  counts: Record<string, number>;
  stationPath: string;
  resourcesPath: string;
  qualityFlags: string[];
};

export const openStationDetailsPath = (stada: string) =>
  /^\d{1,10}$/.test(stada) ? `/data/integration/openstation-details/stations/${stada}.json` : null;
