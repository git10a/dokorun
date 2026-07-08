export function avatarUrl(user: {
  id: string;
  image?: string | null;
  customAvatarAt?: Date | string | null;
}): string | null {
  if (user.customAvatarAt) {
    const v = new Date(user.customAvatarAt).getTime();
    return `/avatar/${user.id}?v=${v}`;
  }
  return user.image ?? null;
}
