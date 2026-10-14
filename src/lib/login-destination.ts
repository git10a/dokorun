// Only internal destinations are accepted, including anchors used to reopen forms.
export function loginDestination(value: string | undefined): string {
  if (!value?.startsWith("/") || value.startsWith("//") || /[\\\u0000-\u0020]/.test(value)) return "/me";
  return value;
}

export function loginCallbackURL(value: string, origin: string): string {
  // Better Auth rejects fragments in relative callbacks, but accepts them in
  // absolute callbacks on the trusted origin. Keep its origin/CSRF checks intact.
  return new URL(loginDestination(value), origin).href;
}
