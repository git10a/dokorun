import type { CourseAtmosphereScene } from "./course-atmosphere";
import additionalAtmospheres from "./race-atmosphere-scenes.json";

export type RaceAtmosphereScene = CourseAtmosphereScene & {
  viewLabel: string;
  // Distances use the same GPX-derived axis as the interactive elevation chart.
  // A venue exterior has no course distance: it is not the on-course view.
  coursePoint?: { distanceM: number; lat: number; lng: number };
};

export type RaceAtmosphere = {
  courseYear: number | null;
  sourceUrl: string;
  scenes: RaceAtmosphereScene[];
};

const raceAtmospheres: Record<string, RaceAtmosphere | undefined> = {
  ...additionalAtmospheres,
  "tokyo-legacy-half-marathon": {
    courseYear: 2026,
    sourceUrl: "https://legacyhalf.tokyo/about/course-map/index.html",
    scenes: [
      {
        id: "legacy-tokyo-dome-city",
        title: "東京ドームシティを左手に",
        viewLabel: "往路・左手の景色",
        description:
          "外堀通りを水道橋へ。左手に東京ドームホテルの高層棟と、白い大きな屋根が見える区間です。この先で白山通りへ入り、神保町を目指します。",
        imageSrc: "/race-atmosphere/legacy-tokyo-dome-city.webp",
        referenceUrl: "https://www.google.com/maps/search/?api=1&query=35.702805%2C139.753291",
        coursePoint: { distanceM: 6345.54, lat: 35.702805, lng: 139.753291 },
      },
      {
        id: "legacy-nihonbashi",
        title: "日本橋を渡り、最初の折り返しへ",
        viewLabel: "往路・南向き",
        description:
          "中央通りを南へ進むと、石造りの欄干と頭上を横切る高架が目印に。日本橋を渡った先で最初の折り返しを迎え、来た道を神保町へ戻ります。",
        imageSrc: "/race-atmosphere/legacy-nihonbashi.webp",
        referenceUrl: "https://www.google.com/maps/search/?api=1&query=35.684584%2C139.774613",
        coursePoint: { distanceM: 9840.55, lat: 35.684584, lng: 139.774613 },
      },
      {
        id: "legacy-hitotsubashi-turnaround",
        title: "一ツ橋河岸の第2折り返しへ",
        viewLabel: "第2折り返し手前・南向き",
        description:
          "神保町から白山通りを南下し、一ツ橋河岸の手前でもう一度折り返します。画像は折り返しへ向かう道の景色です。",
        imageSrc: "/race-atmosphere/legacy-hitotsubashi-turnaround.webp",
        referenceUrl:
          "https://www.google.com/maps/@?api=1&map_action=pano&pano=cktb0ZDv57Wo4uiktIehxQ&heading=170&pitch=0&fov=80",
        coursePoint: { distanceM: 13095.22, lat: 35.692975, lng: 139.758741 },
      },
      {
        id: "legacy-iidabashi-climb",
        title: "飯田橋から市ケ谷へ、上りが続く",
        viewLabel: "復路・飯田橋から市ケ谷方面",
        description:
          "飯田橋を過ぎ、外堀通りを市ケ谷へ戻る区間。左手の木々と右手のビルの間を進み、競技場へ向かって少しずつ高さを戻していきます。",
        imageSrc: "/race-atmosphere/legacy-iidabashi-climb.webp",
        referenceUrl:
          "https://www.google.com/maps/@?api=1&map_action=pano&pano=5n0q8vaAyqCC-AzqicspMQ&heading=215&pitch=0&fov=80",
        coursePoint: { distanceM: 16515.37, lat: 35.695565, lng: 139.738724 },
      },
      {
        id: "legacy-stadium-return",
        title: "外苑西通りから競技場へ戻る",
        viewLabel: "復路・南向き",
        description:
          "終盤は競技場の西側を南下。左手に白い柱が続く外周の低い道路を走ります。フィニッシュ会場が近づいても、競技場の中へ入るまでもうひと区間。",
        imageSrc: "/race-atmosphere/legacy-stadium-return.webp",
        referenceUrl: "https://www.google.com/maps/search/?api=1&query=35.677528%2C139.712730",
        coursePoint: { distanceM: 20619.2, lat: 35.677528, lng: 139.71273 },
      },
      {
        id: "legacy-national-stadium",
        title: "スタートとフィニッシュは国立競技場",
        viewLabel: "北側から見た会場の外観",
        description:
          "何層にも重なる木の軒と、緑に囲まれた大きな曲線が印象的な会場。画像は北側広場から見た外観で、大会当日の入場経路やフィニッシュ地点を示すものではありません。",
        imageSrc: "/race-atmosphere/legacy-national-stadium.webp",
        referenceUrl: "https://www.google.com/maps/search/?api=1&query=35.679480%2C139.715460",
      },
    ],
  },
};

// Do not carry a scenery review over to a different course edition automatically.
export function getRaceAtmosphere(slug: string, courseYear: number | undefined): RaceAtmosphere | undefined {
  const atmosphere = raceAtmospheres[slug];
  return atmosphere && atmosphere.courseYear === (courseYear ?? null) ? atmosphere : undefined;
}
