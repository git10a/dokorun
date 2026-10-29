// Keep readable kilometre ticks on the reference route's own distance axis.
export function courseDistanceTicks(totalM: number, width: number) {
  if (!Number.isFinite(totalM) || totalM <= 0 || !Number.isFinite(width) || width <= 0) return [];
  const steps = [100, 200, 500, 1000, 2000, 5000, 10000, 20000, 50000, 100000];
  const preferred = totalM <= 1000 ? 100 : totalM <= 10000 ? 1000 : 5000;
  const major = steps.find((step) => step >= preferred && (step / totalM) * width >= 28) ?? totalM;
  // 1 km minor ticks for normal race distances; thin them on longer courses.
  const minor = Math.min(major, Math.max(1000, major / 5));
  return Array.from({ length: Math.max(0, Math.ceil(totalM / minor) - 1) }, (_, i) => {
    const distanceM = (i + 1) * minor;
    return { distanceM, label: distanceM % major === 0 ? String(distanceM / 1000) : null };
  });
}

// 100 m steps are easy to read and share; preserve the exact reference finish.
export function snapCourseDistance(distanceM: number, totalM: number) {
  if (!Number.isFinite(distanceM) || !Number.isFinite(totalM) || totalM <= 0) return 0;
  if (distanceM >= totalM) return totalM;
  return Math.max(0, Math.min(totalM, Math.round(distanceM / 100) * 100));
}
