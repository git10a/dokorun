import { MapPin } from "lucide-react";

/**
 * スポットの場所(点)をGoogle Maps Embed APIで表示する。
 * コース形状は自前のMapLibre(CourseMap)が担当し、こちらは「どこにあるか」と経路案内に特化。
 * Embed APIは読込無制限・無料だがキーが必要(NEXT_PUBLIC_GOOGLE_MAPS_API_KEYにリファラ制限付きで設定)。
 * キー未設定時はGoogleマップへのリンクにフォールバックする。
 */
export function LocationMap({ lat, lng, name }: { lat: number; lng: number; name: string }) {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const query = `${lat},${lng}`;
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${query}`;
  const searchUrl = `https://www.google.com/maps/search/?api=1&query=${query}`;

  if (!key) {
    return (
      <a href={searchUrl} target="_blank" rel="noopener noreferrer" className="grid h-[300px] w-full place-items-center rounded-2xl border border-line bg-cream text-center text-sm text-sub">
        <span className="flex flex-col items-center gap-2"><MapPin size={28} className="text-accent" />Googleマップで場所を見る</span>
      </a>
    );
  }

  const src = `https://www.google.com/maps/embed/v1/place?key=${key}&q=${encodeURIComponent(query)}&zoom=15&language=ja&region=JP`;
  return (
    <div className="space-y-3">
      <iframe
        title={`${name}の場所`}
        src={src}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        allowFullScreen
        className="h-[300px] w-full rounded-2xl border border-line"
      />
      <a href={directionsUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-bold text-paper">
        <MapPin size={16} />Googleマップで経路案内
      </a>
    </div>
  );
}
