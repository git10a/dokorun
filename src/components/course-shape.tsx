import { SpotVisual } from "./spot-visual";

export function CourseShape({ coords, name, className }: { coords: [number, number][]; name: string; className?: string }) {
  if (!coords.length) {
    return <SpotVisual slug={name} distanceM={0} courseType="loop" tags={[]} className={className} />;
  }

  const centerLatitude = coords.reduce((sum, [, latitude]) => sum + latitude, 0) / coords.length;
  const longitudeScale = Math.cos(centerLatitude * Math.PI / 180);
  const projected = coords.map(([longitude, latitude]) => [longitude * longitudeScale, -latitude] as const);
  const minX = Math.min(...projected.map(([x]) => x));
  const maxX = Math.max(...projected.map(([x]) => x));
  const minY = Math.min(...projected.map(([, y]) => y));
  const maxY = Math.max(...projected.map(([, y]) => y));
  const width = Math.max(maxX - minX, 0.000001);
  const height = Math.max(maxY - minY, 0.000001);
  const scale = Math.min((320 - 32) / width, (180 - 32) / height);
  const offsetX = (320 - width * scale) / 2;
  const offsetY = (180 - height * scale) / 2;
  const points = projected.map(([x, y]) => `${((x - minX) * scale + offsetX).toFixed(1)},${((y - minY) * scale + offsetY).toFixed(1)}`);
  const [startX, startY] = points[0].split(",");

  return (
    <svg viewBox="0 0 320 180" className={className} preserveAspectRatio="xMidYMid slice" role="img" aria-label={`${name}のコース形状`}>
      <rect width="320" height="180" fill="#F7F5EF" />
      <polyline points={points.join(" ")} fill="none" stroke="#1A1A1A" strokeWidth="4" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={startX} cy={startY} r="7" fill="#2BA84A" stroke="#FFFFFF" strokeWidth="3" />
    </svg>
  );
}
