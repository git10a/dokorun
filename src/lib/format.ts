// 秒数を "m:ss" / "h:mm:ss" にする。alwaysHours なら1時間未満でも "0:mm:ss"(完走タイム・通過タイム用)
export function formatDuration(totalSeconds: number, alwaysHours = false) {
  const rounded = Math.round(totalSeconds);
  const hours = Math.floor(rounded / 3600);
  const minutes = Math.floor((rounded % 3600) / 60);
  const seconds = rounded % 60;
  const mmss = `${String(minutes).padStart(hours || alwaysHours ? 2 : 1, "0")}:${String(seconds).padStart(2, "0")}`;
  return hours || alwaysHours ? `${hours}:${mmss}` : mmss;
}

// コース距離の表示用。"5km" / "2.1km" の数値部分(端数がなければ整数)
export function formatDistanceKm(distanceM: number) {
  return (distanceM / 1000).toFixed(distanceM % 1000 ? 1 : 0);
}
