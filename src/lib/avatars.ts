export const AVATAR_KEYS = [
  "runner-01",
  "runner-02",
  "runner-03",
  "shoe-01",
  "shoe-02",
  "track-01",
  "track-02",
  "mountain-01",
  "river-01",
  "park-01",
  "sun-01",
  "pace-01",
] as const;

export type AvatarKey = (typeof AVATAR_KEYS)[number];

export function isAvatarKey(value: unknown): value is AvatarKey {
  return typeof value === "string" && (AVATAR_KEYS as readonly string[]).includes(value);
}

export function avatarUrl(user: { avatarKey?: string | null; image?: string | null }): string | null {
  if (isAvatarKey(user.avatarKey)) return `/avatars/${user.avatarKey}.svg`;
  return user.image ?? null;
}
