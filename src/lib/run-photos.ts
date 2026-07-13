export function runPhotoUrl(key: string) {
  const base = process.env.R2_PUBLIC_URL;
  return base ? `${base.replace(/\/$/, "")}/${key}` : "";
}
