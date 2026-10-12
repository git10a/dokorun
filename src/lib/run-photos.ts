export const runPhotoKeyPattern = /^runs\/[a-f0-9-]{36}\/[a-f0-9-]{36}\.webp$/;

export function runPhotoUrl(key: string) {
  return runPhotoKeyPattern.test(key) ? `/api/run-photos/${key}` : "";
}
