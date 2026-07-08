import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SpotEditForm } from "@/components/spot-edit-form";
import { TrackView } from "@/components/track-view";
import { getSpotBySlug } from "@/db/data";
import { requireUser } from "@/lib/user";

export const dynamic = "force-dynamic";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const spot = await getSpotBySlug(slug);
  return { title: spot ? `${spot.name}の情報修正` : "スポット情報の修正", robots: { index: false } };
}

export default async function SpotEditPage({ params }: { params: Params }) {
  const { slug } = await params;
  await requireUser(`/spots/${slug}/edit`);
  const spot = await getSpotBySlug(slug);
  if (!spot) notFound();
  return (
    <div className="mx-auto max-w-2xl px-4 py-10 md:px-6">
      <TrackView name="spot_edit_view" meta={{ slug: spot.slug }} />
      <Link href={`/spots/${spot.slug}`} className="text-sm font-bold text-accent">← {spot.name}へ戻る</Link>
      <h1 className="mt-7 text-3xl font-black">スポット情報の修正</h1>
      <p className="mt-3 text-sub">{spot.name}</p>
      <div className="mt-6 rounded-2xl bg-cream px-5 py-4 text-sm leading-7">
        <p className="font-bold">スポット情報の修正にご協力ありがとうございます 🙏</p>
        <ul className="mt-2 list-disc pl-5 text-sub">
          <li>わかる項目だけの修正で大丈夫です</li>
          <li>修正した内容はすぐにページへ反映されます</li>
          <li>どこランのユーザーなら誰でも情報を修正できます</li>
        </ul>
      </div>
      <SpotEditForm spot={{
        id: spot.id,
        slug: spot.slug,
        name: spot.name,
        nameKana: spot.nameKana,
        description: spot.description,
        access: spot.access,
        hasToilet: spot.hasToilet,
        hasWaterFountain: spot.hasWaterFountain,
        hasVendingMachine: spot.hasVendingMachine,
        hasLocker: spot.hasLocker,
        hasShower: spot.hasShower,
        hasSentoNearby: spot.hasSentoNearby,
        hasParking: spot.hasParking,
        hasConvenienceStore: spot.hasConvenienceStore,
        nightLighting: spot.nightLighting,
        courseType: spot.courseType,
        surface: spot.surface,
        signalsCount: spot.signalsCount,
      }} />
    </div>
  );
}
