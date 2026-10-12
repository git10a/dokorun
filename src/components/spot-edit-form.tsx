"use client";

import Link from "next/link";
import { useActionState } from "react";
import { updateSpotInfo, type SpotEditState } from "@/app/spots/[slug]/edit/actions";
import { courseTypeLabels, courseTypes, facilityKeys, facilityLabels, lightingLabels, lightings, surfaceLabels, surfaces, type CourseType, type Lighting, type Surface } from "@/lib/types";
import { SectionHeading } from "@/components/section-heading";

export type SpotEditValues = {
  id: string;
  slug: string;
  name: string;
  nameKana: string;
  description: string;
  access: string | null;
  hasToilet: boolean;
  hasWaterFountain: boolean;
  hasVendingMachine: boolean;
  hasLocker: boolean;
  hasShower: boolean;
  hasSentoNearby: boolean;
  hasParking: boolean;
  hasConvenienceStore: boolean;
  nightLighting: Lighting;
  courseType: CourseType;
  surface: Surface;
  signalsCount: number | null;
};

const initialState: SpotEditState = {};
const fieldClass = "mt-2 h-11 w-full rounded-lg border border-line bg-paper px-3 outline-none focus:border-ink";
const facilityFields = facilityKeys.map((key) => [key, facilityLabels[key]] as const);

export function SpotEditForm({ spot }: { spot: SpotEditValues }) {
  const [state, action, pending] = useActionState(updateSpotInfo, initialState);
  const error = (name: string) => state.errors?.[name]?.[0];
  return (
    <form action={action} className="mt-8 space-y-10">
      <input type="hidden" name="spotId" value={spot.id} />
      <input type="hidden" name="spotSlug" value={spot.slug} />
      {state.message && <div className="rounded-lg bg-danger-soft px-4 py-3 text-sm font-bold text-danger">{state.message}</div>}
      <section>
        <SectionHeading className="mb-5">基本情報</SectionHeading>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="名前" name="name" required maxLength={80} defaultValue={spot.name} error={error("name")} />
          <Field label="かな" name="nameKana" required maxLength={120} defaultValue={spot.nameKana} error={error("nameKana")} />
        </div>
        <label className="mt-5 block text-sm font-bold">紹介文<textarea name="description" required rows={7} maxLength={2000} defaultValue={spot.description} className="mt-2 w-full rounded-lg border border-line p-3 font-normal leading-7 outline-none focus:border-ink" />{error("description") && <span className="mt-1 block text-xs text-danger">{error("description")}</span>}</label>
        <label className="mt-5 block text-sm font-bold">アクセス<textarea name="access" rows={3} maxLength={1000} defaultValue={spot.access ?? ""} placeholder="最寄り駅からの行き方、スタート地点の目印など" className="mt-2 w-full rounded-lg border border-line p-3 font-normal outline-none focus:border-ink" />{error("access") && <span className="mt-1 block text-xs text-danger">{error("access")}</span>}</label>
      </section>
      <section>
        <SectionHeading className="mb-2">コース情報</SectionHeading>
        <p className="mb-5 text-sm text-sub">距離・高低差はコースデータから自動計算しているため、このフォームからは修正できません。おかしい場合は<Link href="/contact" className="font-bold text-accent">お問い合わせ</Link>からご連絡ください。</p>
        <div className="grid gap-5 sm:grid-cols-3">
          <label className="text-sm font-bold">形状<select name="courseType" defaultValue={spot.courseType} className={fieldClass}>{courseTypes.map((value) => <option key={value} value={value}>{courseTypeLabels[value]}</option>)}</select></label>
          <label className="text-sm font-bold">路面<select name="surface" defaultValue={spot.surface} className={fieldClass}>{surfaces.map((value) => <option key={value} value={value}>{surfaceLabels[value]}</option>)}</select></label>
          <Field label="信号数" name="signalsCount" type="number" min={0} max={999} defaultValue={spot.signalsCount ?? ""} error={error("signalsCount")} />
        </div>
      </section>
      <section className="space-y-7">
        <fieldset>
          <legend className="mb-2 border-l-4 border-brand pl-3 text-xl font-bold">設備</legend>
          <p className="mb-4 text-sm text-sub">コース周辺で利用できるものにチェックしてください。</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{facilityFields.map(([name, label]) => <label key={name} className="flex items-center gap-2 rounded-lg border border-line p-3 text-sm"><input type="checkbox" name={name} defaultChecked={spot[name]} className="size-4 accent-brand" />{label}</label>)}</div>
        </fieldset>
        <fieldset>
          <legend className="mb-3 font-bold">夜間の明るさ</legend>
          <div className="flex flex-wrap gap-4">{([["", "わからない"], ...lightings.map((value) => [value, lightingLabels[value]] as const)] as const).map(([value, label]) => <label key={value} className="flex items-center gap-2 text-sm"><input type="radio" name="nightLighting" value={value} defaultChecked={(spot.nightLighting ?? "") === value} className="accent-brand" />{label}</label>)}</div>
        </fieldset>
      </section>
      <div className="space-y-4 border-t border-line pt-6">
        <button disabled={pending} className="w-full rounded-lg bg-brand px-7 py-3.5 font-bold hover:bg-brand-dark disabled:opacity-50 sm:w-auto sm:min-w-56">{pending ? "保存中…" : "修正内容を保存"}</button>
        <p className="text-sm text-sub">住所・地図上の位置・コースの形の修正は<Link href="/contact" className="font-bold text-accent">お問い合わせ</Link>からお願いします。</p>
      </div>
    </form>
  );
}

function Field({ label, error, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string }) {
  return <label className="text-sm font-bold">{label}<input {...props} className={fieldClass} />{error && <span className="mt-1 block text-xs text-danger">{error}</span>}</label>;
}
