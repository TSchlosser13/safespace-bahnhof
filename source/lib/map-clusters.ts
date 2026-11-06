/** A source position projected into CSS pixels for presentation-only clustering. */
export type ClusterPoint = {key: string; stationId: string; point: [number, number]};
export type MapCluster = {id: string; point: [number, number]; members: ClusterPoint[]; count: number};

type WorkingCluster = {index: number; point: [number, number]; members: ClusterPoint[]; bucket: string};
const compareText = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;
const comparePoints = (a: ClusterPoint, b: ClusterPoint) => a.point[0] - b.point[0]
  || a.point[1] - b.point[1] || compareText(a.stationId, b.stationId) || compareText(a.key, b.key);

/**
 * Groups nearby screen positions without changing the underlying coordinates.
 * Sorted input and nearest-centroid assignment make results independent of input order.
 * A spatial index checks adjoining cells, including points across a cell boundary.
 * This is deliberately not connected-component clustering: a chain of close points
 * must not turn an entire region into one cluster. Count means distinct stations;
 * members retain every position, including several published positions for one station.
 */
export function clusterMapPoints(points: ClusterPoint[], cellSize = 42): MapCluster[] {
  if (!Number.isFinite(cellSize) || cellSize <= 0) throw new RangeError('cellSize must be positive and finite');
  if (points.some(p => !p.point.every(Number.isFinite))) throw new RangeError('Map positions must be finite');
  const ordered = [...points].sort(comparePoints);
  const buckets = new Map<string, Set<WorkingCluster>>();
  const clusters: WorkingCluster[] = [];
  const bucketKey = (p: [number, number]) => `${Math.floor(p[0] / cellSize)},${Math.floor(p[1] / cellSize)}`;
  const insert = (cluster: WorkingCluster) => {
    const bucket = buckets.get(cluster.bucket) ?? new Set<WorkingCluster>();
    bucket.add(cluster);
    buckets.set(cluster.bucket, bucket);
  };
  for (const source of ordered) {
    const [x, y] = source.point;
    const bx = Math.floor(x / cellSize), by = Math.floor(y / cellSize);
    let nearest: WorkingCluster | undefined;
    let nearestDistance = cellSize * cellSize;
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (const candidate of buckets.get(`${bx + dx},${by + dy}`) ?? []) {
          const distance = (candidate.point[0] - x) ** 2 + (candidate.point[1] - y) ** 2;
          if (distance <= nearestDistance && (!nearest || distance < nearestDistance || candidate.index < nearest.index)) {
            nearest = candidate;
            nearestDistance = distance;
          }
        }
      }
    }
    if (!nearest) {
      const cluster: WorkingCluster = {index: clusters.length, point: [x, y], members: [source], bucket: bucketKey(source.point)};
      clusters.push(cluster);
      insert(cluster);
      continue;
    }
    nearest.members.push(source);
    const size = nearest.members.length;
    nearest.point = [nearest.point[0] + (x - nearest.point[0]) / size, nearest.point[1] + (y - nearest.point[1]) / size];
    const nextBucket = bucketKey(nearest.point);
    if (nextBucket !== nearest.bucket) {
      const oldBucket = buckets.get(nearest.bucket)!;
      oldBucket.delete(nearest);
      if (!oldBucket.size) buckets.delete(nearest.bucket);
      nearest.bucket = nextBucket;
      insert(nearest);
    }
  }
  return clusters.map(({index, point, members}) => ({
    id: `map-cluster-${index}`,
    point,
    members,
    count: new Set(members.map(p => p.stationId)).size,
  }));
}
