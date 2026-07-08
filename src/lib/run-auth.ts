export function assertRunOwnership(ownerUserId: string, actorUserId: string) {
  if (ownerUserId !== actorUserId) throw new Error("この記録を変更する権限がありません");
}

