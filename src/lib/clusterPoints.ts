// Greedy screen-space clustering shared by CityMap (real Google map) and
// MockCityMap (no-key canvas): points whose on-screen positions fall within
// `radius` px of a cluster's running centroid merge into that cluster. Pure
// and order-stable, so the same inputs always cluster the same way.
export interface ClusterPoint<T> {
  item: T;
  x: number;
  y: number;
}

export interface Cluster<T> {
  x: number;
  y: number;
  items: T[];
}

export function clusterPoints<T>(points: ClusterPoint<T>[], radius: number): Cluster<T>[] {
  const clusters: Cluster<T>[] = [];
  const r2 = radius * radius;
  for (const p of points) {
    let hit: Cluster<T> | null = null;
    for (const c of clusters) {
      const dx = c.x - p.x;
      const dy = c.y - p.y;
      if (dx * dx + dy * dy <= r2) {
        hit = c;
        break;
      }
    }
    if (hit) {
      const n = hit.items.length;
      hit.x = (hit.x * n + p.x) / (n + 1);
      hit.y = (hit.y * n + p.y) / (n + 1);
      hit.items.push(p.item);
    } else {
      clusters.push({ x: p.x, y: p.y, items: [p.item] });
    }
  }
  return clusters;
}

// Web-Mercator world pixel position at a given zoom (256px tile world) —
// lets the real map cluster by on-screen distance without needing the Maps
// projection object.
export function worldPx(lat: number, lon: number, zoom: number) {
  const scale = 256 * 2 ** zoom;
  const sin = Math.min(0.9999, Math.max(-0.9999, Math.sin((lat * Math.PI) / 180)));
  return {
    x: ((lon + 180) / 360) * scale,
    y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * scale,
  };
}
