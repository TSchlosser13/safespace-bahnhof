export type StationSize = 'large' | 'medium' | 'small' | 'unknown';

export const stationSizeLabels: Record<StationSize, string> = {
  large: 'Groß', medium: 'Mittel', small: 'Klein', unknown: 'Ohne Kategorie',
};

export function parseStationCategory(value: unknown): number | null {
  const code = typeof value === 'string' ? value.trim() : value;
  if (typeof code !== 'number' && (typeof code !== 'string' || !/^[1-7]$/.test(code))) return null;
  const category = Number(code);
  return Number.isInteger(category) && category >= 1 && category <= 7 ? category : null;
}

// App-level simplification of DB's seven categories, not a physical size measurement.
export function stationSize(value: unknown): StationSize {
  const category = parseStationCategory(value);
  return category === null ? 'unknown' : category <= 2 ? 'large' : category <= 4 ? 'medium' : 'small';
}

export function stationSizeDescription(value: unknown): string {
  const category = parseStationCategory(value);
  return category === null ? stationSizeLabels.unknown : `${stationSizeLabels[stationSize(category)]} · Kategorie ${category}`;
}
