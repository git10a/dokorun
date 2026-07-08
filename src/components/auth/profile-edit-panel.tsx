"use client";

import { useState } from "react";
import { AvatarUploader } from "@/components/auth/avatar-uploader";
import { PbForm } from "@/components/auth/pb-form";
import { ProfileForm } from "@/components/auth/profile-form";

type ProfileEditPanelProps = {
  avatarUser: { id: string; image: string | null; customAvatarAt: Date | string | null };
  profileUser: {
    name: string;
    handle: string;
    bio: string | null;
    instagram: string | null;
    xHandle: string | null;
    strava: string | null;
    runningSinceYear: number | null;
    runningSinceMonth: number | null;
  };
  pbs: { event: string; timeS: number; competitionName: string | null }[];
};

export function ProfileEditPanel({ avatarUser, profileUser, pbs }: ProfileEditPanelProps) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-4">
      <button type="button" onClick={() => setOpen((value) => !value)} className="rounded-lg border border-line px-4 py-2 text-sm font-bold hover:bg-cream">
        {open ? "編集を閉じる" : "プロフィールを編集"}
      </button>
      {open && (
        <div className="mt-4">
          <AvatarUploader user={avatarUser} />
          <ProfileForm user={profileUser} />
          <section className="mt-10">
            <h2 className="border-l-4 border-brand pl-3 text-xl font-bold">自己ベスト</h2>
            <PbForm pbs={pbs} />
          </section>
        </div>
      )}
    </div>
  );
}
