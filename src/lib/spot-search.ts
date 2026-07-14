export type SpotSearchParams = Record<string, string | undefined>;

export type SearchFilters = {
  pref?: string;
  tags?: string[];
  type?: string;
  distMin?: number;
  distMax?: number;
  q?: string;
  toilet?: boolean;
  locker?: boolean;
  sento?: boolean;
  popular?: boolean;
  sort?: string;
  lat?: number;
  lng?: number;
  page?: number;
  limit?: number;
};

const courseTypeRequestLabels: Record<string, string> = {
  loop: "周回",
  out_and_back: "往復",
  one_way: "ワンウェイ",
  track: "トラック",
};

const distanceRequestLabels: Record<string, string> = {
  "0-3": "〜3km",
  "3-5": "3〜5km",
  "5-10": "5〜10km",
  "10-": "10km〜",
};

export function normalizeSearchParams(raw: Record<string, string | string[] | undefined>): SpotSearchParams {
  return Object.fromEntries(
    Object.entries(raw).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value]),
  );
}

export function toSearchFilters(params: SpotSearchParams): SearchFilters {
  const distance = params.dist?.split("-");
  const lat = Number(params.lat);
  const lng = Number(params.lng);
  const validGeo = Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;

  return {
    pref: params.pref,
    tags: params.tags?.split(",").filter(Boolean),
    type: params.type,
    distMin: distance?.[0] ? Number(distance[0]) * 1000 : undefined,
    distMax: distance?.[1] ? Number(distance[1]) * 1000 : undefined,
    q: params.q,
    toilet: params.toilet === "1",
    locker: params.locker === "1",
    sento: params.sento === "1",
    popular: params.popular === "1",
    sort: params.sort,
    page: Math.max(1, Number(params.page) || 1),
    lat: validGeo ? lat : undefined,
    lng: validGeo ? lng : undefined,
  };
}

export function selectedFilterDescriptions(params: SpotSearchParams, tagNames: string[]) {
  const descriptions: string[] = [];
  if (params.popular === "1") descriptions.push("一覧: 定番・走りたいがあるスポット");
  if (params.q) descriptions.push(`キーワード: ${params.q}`);
  if (params.pref) descriptions.push(`都道府県: ${params.pref}`);
  if (tagNames.length) descriptions.push(`特徴: ${tagNames.join("、")}`);
  if (params.type) descriptions.push(`コース形状: ${courseTypeRequestLabels[params.type] ?? params.type}`);
  if (params.dist) descriptions.push(`距離: ${distanceRequestLabels[params.dist] ?? params.dist}`);
  if (params.toilet === "1") descriptions.push("設備: トイレあり");
  if (params.locker === "1") descriptions.push("設備: ロッカーあり");
  if (params.sento === "1") descriptions.push("設備: 銭湯・サウナが近い");
  return descriptions;
}

export function buildSpotRequestHref(params: SpotSearchParams, tagNames: string[]) {
  const conditions = selectedFilterDescriptions(params, tagNames);
  const lines = [
    "検索で条件に合うスポットが見つかりませんでした。掲載候補をリクエストします。",
    "",
    "探していた条件:",
    ...(conditions.length ? conditions : ["未指定"]),
    "",
    "具体的には:",
    "例: 明治神宮外苑1周コース など",
    "",
  ];
  return `/contact?${new URLSearchParams({ category: "spot_request", message: lines.join("\n") })}`;
}

export function searchParamsHref(path: string, params: SpotSearchParams, changes: Record<string, string | undefined>) {
  const next = new URLSearchParams(Object.entries(params).filter((entry): entry is [string, string] => Boolean(entry[1])));
  for (const [key, value] of Object.entries(changes)) {
    if (value) next.set(key, value);
    else next.delete(key);
  }
  return `${path}${next.size ? `?${next}` : ""}`;
}
