"use client";

import { useActionState } from "react";
import { createCommunity, updateCommunity } from "@/app/admin/communities/actions";
import type { FormState } from "@/app/admin/actions";

type SpotOption = { id: string; name: string; prefecture: string };
type Initial = {
  id?: string; name?: string; description?: string; schedule?: string | null;
  instagram?: string | null; xHandle?: string | null; website?: string | null;
  isPublished?: boolean; spotIds?: string[];
};

const initialState: FormState = {};
const fieldClass = "mt-2 h-11 w-full rounded-lg border border-line bg-paper px-3 outline-none focus:border-ink";

export function CommunityForm({ mode, spotOptions, initial = {} }: { mode: "create" | "edit"; spotOptions: SpotOption[]; initial?: Initial }) {
  const [state, action, pending] = useActionState(mode === "edit" ? updateCommunity : createCommunity, initialState);
  const error = (name: string) => state.errors?.[name]?.[0];
  const prefectures = [...new Set(spotOptions.map((spot) => spot.prefecture))];
  return (
    <form action={action} className="space-y-10">
      {initial.id && <input type="hidden" name="id" value={initial.id} />}
      {state.message && <div className="rounded-lg bg-[#FDECEC] px-4 py-3 text-sm font-bold text-danger">{state.message}</div>}
      <section>
        <h2 className="mb-5 text-xl font-bold">1. 基本情報</h2>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="名前" name="name" required defaultValue={initial.name} error={error("name")} />
          <Field label="活動日時" name="schedule" placeholder="毎週水曜 19:30〜" defaultValue={initial.schedule ?? ""} />
        </div>
        <label className="mt-5 block text-sm font-bold">紹介文<textarea name="description" required rows={5} defaultValue={initial.description} className="mt-2 w-full rounded-lg border border-line p-3 font-normal leading-7 outline-none focus:border-ink" />{error("description") && <span className="mt-1 block text-xs text-danger">{error("description")}</span>}</label>
      </section>
      <section>
        <h2 className="mb-2 text-xl font-bold">2. リンク</h2>
        <p className="mb-5 text-sm text-sub">ハンドル名(@なしでも可)またはURLで入力できます。</p>
        <div className="grid gap-5 sm:grid-cols-3">
          <Field label="Instagram" name="instagram" placeholder="hinode_running" defaultValue={initial.instagram ?? ""} />
          <Field label="X" name="xHandle" placeholder="hinode_running" defaultValue={initial.xHandle ?? ""} />
          <Field label="Webサイト" name="website" placeholder="https://example.com" defaultValue={initial.website ?? ""} />
        </div>
      </section>
      <section>
        <h2 className="mb-2 text-xl font-bold">3. 活動スポット</h2>
        <p className="mb-5 text-sm text-sub">このコミュニティが活動しているスポットを選んでください(複数可)。選んだスポットのページに表示されます。</p>
        <div className="space-y-5">
          {prefectures.map((prefecture) => (
            <div key={prefecture}>
              <p className="mb-2 text-sm font-bold text-sub">{prefecture}</p>
              <div className="flex flex-wrap gap-2">
                {spotOptions.filter((spot) => spot.prefecture === prefecture).map((spot) => (
                  <label key={spot.id} className="cursor-pointer">
                    <input type="checkbox" name="spotIds" value={spot.id} defaultChecked={initial.spotIds?.includes(spot.id)} className="peer sr-only" />
                    <span className="inline-flex rounded-full bg-cream px-3 py-2 text-sm peer-checked:bg-brand">{spot.name}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-line pt-6">
        <label className="flex items-center gap-2 font-bold"><input type="checkbox" name="isPublished" defaultChecked={initial.isPublished ?? true} className="size-5 accent-[#FFD900]" />公開する</label>
        <button disabled={pending} className="min-w-40 rounded-lg bg-brand px-7 py-3 font-bold hover:bg-brand-dark disabled:opacity-50">{pending ? "保存中…" : mode === "edit" ? "変更を保存" : "コミュニティを登録"}</button>
      </div>
    </form>
  );
}

function Field({ label, error, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string }) {
  return <label className="text-sm font-bold">{label}<input {...props} className={fieldClass} />{error && <span className="mt-1 block text-xs text-danger">{error}</span>}</label>;
}
