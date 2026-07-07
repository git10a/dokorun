"use client";

import { useActionState, useState } from "react";
import { createSpot, updateSpot, type FormState } from "@/app/admin/actions";
import { prefectures } from "@/lib/prefectures";
import type { CourseType, Lighting, LineString, Surface } from "@/lib/types";
import { ImageUploader } from "./image-uploader";
import { GpxUploader } from "./gpx-uploader";

type Tag = { id: string; name: string; category: string };
type Initial = {
  id?: string; name?: string; nameKana?: string; slug?: string; prefecture?: string; city?: string; lat?: number; lng?: number;
  description?: string; access?: string | null; hasToilet?: boolean; hasWaterFountain?: boolean; hasVendingMachine?: boolean; hasLocker?: boolean;
  hasShower?: boolean; hasSentoNearby?: boolean; hasParking?: boolean; hasConvenienceStore?: boolean; nightLighting?: Lighting; isPublished?: boolean;
  course?: { geojson: unknown; distanceM: number; elevationGainM: number | null; signalsCount: number | null; courseType: CourseType; surface: Surface };
  tagIds?: string[]; photos?: { url: string }[];
};

const initialState: FormState = {};
const fieldClass = "mt-2 h-11 w-full rounded-lg border border-line bg-paper px-3 outline-none focus:border-ink";

export function SpotForm({ mode, tags, initial = {}, uploadEnabled }: { mode: "create" | "edit"; tags: Tag[]; initial?: Initial; uploadEnabled: boolean }) {
  const [state, action, pending] = useActionState(mode === "edit" ? updateSpot : createSpot, initialState);
  const [photoUrls, setPhotoUrls] = useState(initial.photos?.map((photo) => photo.url).join("\n") ?? "");
  const error = (name: string) => state.errors?.[name]?.[0];
  const facilityFields = [["hasToilet", "トイレ"], ["hasWaterFountain", "水飲み場"], ["hasVendingMachine", "自販機"], ["hasLocker", "ロッカー"], ["hasShower", "シャワー"], ["hasSentoNearby", "銭湯・サウナ近く"], ["hasParking", "駐車場"], ["hasConvenienceStore", "コンビニ"]] as const;
  return (
    <form action={action} className="space-y-10">
      {initial.id && <input type="hidden" name="id" value={initial.id} />}
      {state.message && <div className="rounded-lg bg-[#FDECEC] px-4 py-3 text-sm font-bold text-danger">{state.message}</div>}
      <section className="space-y-4"><div><h2 className="text-xl font-bold">1. GPX・代表点</h2><p className="mt-1 text-sm text-sub">GPXを選ぶと、ルートと距離、高低差、形状、スタート地点を自動入力します。GPXなしでも登録できます。</p></div><GpxUploader initialGeojson={(initial.course?.geojson as LineString | null) ?? null} initialLat={initial.lat ?? 35.6812} initialLng={initial.lng ?? 139.7671} /><div className="grid gap-4 sm:grid-cols-2"><Field label="緯度" name="lat" id="lat" type="number" step="any" required defaultValue={initial.lat ?? ""} error={error("lat")} /><Field label="経度" name="lng" id="lng" type="number" step="any" required defaultValue={initial.lng ?? ""} error={error("lng")} /></div></section>
      <section><h2 className="mb-5 text-xl font-bold">2. 基本情報</h2><div className="grid gap-5 sm:grid-cols-2"><Field label="名前" name="name" required defaultValue={initial.name} error={error("name")} /><Field label="かな" name="nameKana" required defaultValue={initial.nameKana} error={error("nameKana")} /><Field label="slug" name="slug" required pattern="[a-z0-9-]+" placeholder="kokyo" defaultValue={initial.slug} error={error("slug")} /><label className="text-sm font-bold">都道府県<select name="prefecture" required defaultValue={initial.prefecture ?? ""} className={fieldClass}><option value="">選択してください</option>{prefectures.map((prefecture) => <option key={prefecture}>{prefecture}</option>)}</select>{error("prefecture") && <span className="mt-1 block text-xs text-danger">{error("prefecture")}</span>}</label><Field label="市区町村" name="city" required defaultValue={initial.city} error={error("city")} /></div><label className="mt-5 block text-sm font-bold">紹介文<textarea name="description" required rows={7} defaultValue={initial.description} className="mt-2 w-full rounded-lg border border-line p-3 font-normal leading-7 outline-none focus:border-ink" />{error("description") && <span className="mt-1 block text-xs text-danger">{error("description")}</span>}</label><label className="mt-5 block text-sm font-bold">アクセス<textarea name="access" rows={3} defaultValue={initial.access ?? ""} className="mt-2 w-full rounded-lg border border-line p-3 font-normal outline-none focus:border-ink" /></label></section>
      <section><h2 className="mb-5 text-xl font-bold">3. コース情報</h2><div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"><Field label="距離（km）" name="distanceKm" id="distanceKm" type="number" step="0.001" min="0.001" required defaultValue={initial.course ? initial.course.distanceM / 1000 : ""} error={error("distanceKm")} /><Field label="獲得標高（m）" name="elevationGainM" id="elevationGainM" type="number" min="0" defaultValue={initial.course?.elevationGainM ?? ""} /><Field label="信号数" name="signalsCount" type="number" min="0" defaultValue={initial.course?.signalsCount ?? ""} /><label className="text-sm font-bold">形状<select name="courseType" id="courseType" defaultValue={initial.course?.courseType ?? "loop"} className={fieldClass}><option value="loop">周回</option><option value="out_and_back">往復</option><option value="one_way">ワンウェイ</option><option value="track">トラック</option></select></label><label className="text-sm font-bold">路面<select name="surface" defaultValue={initial.course?.surface ?? "asphalt"} className={fieldClass}><option value="asphalt">舗装路</option><option value="dirt">土</option><option value="track">トラック</option><option value="trail">トレイル</option><option value="mixed">混合</option></select></label></div></section>
      <section className="space-y-7"><div><h2 className="mb-4 text-xl font-bold">4. 特徴・設備</h2><div className="flex flex-wrap gap-2">{tags.map((tag) => <label key={tag.id} className="cursor-pointer"><input type="checkbox" name="tagIds" value={tag.id} defaultChecked={initial.tagIds?.includes(tag.id)} className="peer sr-only" /><span className="inline-flex rounded-full bg-cream px-3 py-2 text-sm peer-checked:bg-brand">{tag.name}</span></label>)}</div></div><fieldset><legend className="mb-3 font-bold">設備</legend><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{facilityFields.map(([name, label]) => <label key={name} className="flex items-center gap-2 rounded-lg border border-line p-3 text-sm"><input type="checkbox" name={name} defaultChecked={Boolean(initial[name])} className="size-4 accent-[#FFD900]" />{label}</label>)}</div></fieldset><fieldset><legend className="mb-3 font-bold">夜間の明るさ</legend><div className="flex flex-wrap gap-4">{[["", "未設定"], ["bright", "夜も明るい"], ["partial", "一部照明あり"], ["dark", "夜は暗い"]].map(([value, label]) => <label key={value} className="flex items-center gap-2 text-sm"><input type="radio" name="nightLighting" value={value} defaultChecked={(initial.nightLighting ?? "") === value} className="accent-[#FFD900]" />{label}</label>)}</div></fieldset></section>
      <section><h2 className="mb-2 text-xl font-bold">5. 写真</h2><p className="mb-4 text-sm text-sub">画像URLを1行に1件入力できます。先頭の画像がメイン写真になります。</p>{uploadEnabled && <div className="mb-4"><ImageUploader onUploaded={(url) => setPhotoUrls((current) => current ? `${current}\n${url}` : url)} /></div>}<textarea name="photoUrls" value={photoUrls} onChange={(event) => setPhotoUrls(event.target.value)} rows={5} placeholder="https://example.com/photo.jpg" className="w-full rounded-lg border border-line p-3 font-mono text-sm outline-none focus:border-ink" /></section>
      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-line pt-6"><label className="flex items-center gap-2 font-bold"><input type="checkbox" name="isPublished" defaultChecked={initial.isPublished ?? true} className="size-5 accent-[#FFD900]" />公開する</label><button disabled={pending} className="min-w-40 rounded-lg bg-brand px-7 py-3 font-bold hover:bg-brand-dark disabled:opacity-50">{pending ? "保存中…" : mode === "edit" ? "変更を保存" : "スポットを登録"}</button></div>
    </form>
  );
}

function Field({ label, error, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string }) {
  return <label className="text-sm font-bold">{label}<input {...props} className={fieldClass} />{error && <span className="mt-1 block text-xs text-danger">{error}</span>}</label>;
}
