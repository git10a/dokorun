export type Coordinate = [number, number];

function squaredDistanceToSegment(point: Coordinate, start: Coordinate, end: Coordinate) {
  let x = start[0];
  let y = start[1];
  let dx = end[0] - x;
  let dy = end[1] - y;

  if (dx !== 0 || dy !== 0) {
    const t = ((point[0] - x) * dx + (point[1] - y) * dy) / (dx * dx + dy * dy);
    if (t > 1) {
      x = end[0];
      y = end[1];
    } else if (t > 0) {
      x += dx * t;
      y += dy * t;
    }
  }

  // 零長セグメント(閉ループの始点==終点)でも点までの距離を返す。
  // if内に置くと零長時に常に0となり、閉ループ全体が始点・終点の2点に潰れる
  dx = point[0] - x;
  dy = point[1] - y;

  return dx * dx + dy * dy;
}

export function simplifyLine(coords: Coordinate[], tolerance: number): Coordinate[] {
  if (coords.length <= 2 || tolerance <= 0) return coords.slice();
  const keep = new Uint8Array(coords.length);
  const stack: [number, number][] = [[0, coords.length - 1]];
  const squaredTolerance = tolerance * tolerance;
  keep[0] = 1;
  keep[coords.length - 1] = 1;

  while (stack.length) {
    const [first, last] = stack.pop()!;
    let furthestIndex = -1;
    let furthestDistance = squaredTolerance;
    for (let index = first + 1; index < last; index += 1) {
      const distance = squaredDistanceToSegment(coords[index], coords[first], coords[last]);
      if (distance > furthestDistance) {
        furthestDistance = distance;
        furthestIndex = index;
      }
    }
    if (furthestIndex !== -1) {
      keep[furthestIndex] = 1;
      stack.push([first, furthestIndex], [furthestIndex, last]);
    }
  }

  return coords.filter((_, index) => keep[index]);
}

export function simplifyLineToLimit(coords: Coordinate[], limit = 60): Coordinate[] {
  if (coords.length <= limit) return coords.slice();
  let tolerance = 0.000001;
  let simplified = coords;
  while (simplified.length > limit && tolerance < 1) {
    simplified = simplifyLine(coords, tolerance);
    tolerance *= 2;
  }
  if (simplified.length <= limit) return simplified;
  const step = (simplified.length - 1) / (limit - 1);
  return Array.from({ length: limit }, (_, index) => simplified[Math.round(index * step)]);
}
