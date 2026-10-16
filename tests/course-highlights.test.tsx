import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { getCourseGuide } from "@/lib/course-guides";
import { LongCourseGuide } from "@/components/long-course-guide";
import { CourseAtmosphere } from "@/components/course-atmosphere";
import { SpotCourseMap } from "@/components/spot-course-map";
import { courseAtmospheres } from "@/lib/course-atmosphere";

vi.mock("@/components/map/course-guide-map", () => ({ CourseGuideMap: () => null }));
vi.mock("@/components/member-gpx-link", () => ({ MemberGpxLink: () => null }));
vi.mock("@/components/map/course-map", () => ({ CourseMap: () => null }));

async function renderGuide(slug: string, withoutAtmosphere = false) {
  const guide = await getCourseGuide(slug);
  if (!guide)
    return renderToStaticMarkup(
      createElement(SpotCourseMap, {
        slug,
        name: slug,
        lat: 36,
        lng: 138,
        geojson: {
          type: "LineString",
          coordinates: [
            [138, 36],
            [138.01, 36.01],
          ],
        },
        atmosphere: courseAtmospheres[slug],
      }),
    );
  return renderToStaticMarkup(
    createElement(LongCourseGuide, {
      guide: withoutAtmosphere ? { ...guide, atmosphere: undefined } : guide,
      geojson: {
        type: "LineString",
        coordinates: [
          [139.69, 35.67],
          [139.7, 35.68],
        ],
      },
      courseType: "loop",
      surface: "asphalt",
    }),
  );
}

describe("course highlights", () => {
  it("replaces route access with official closure information for an unavailable course", async () => {
    const html = await renderGuide("yoro-daifukuyama");
    expect(html).toContain("この周回は現在利用できません");
    expect(html).toContain("通行止め情報を確認");
    expect(html).not.toContain("アクセスを確認</span>");
    expect(html).not.toContain("スタート地点を決める");
    expect(html).not.toContain("コースをダウンロード");
    const normal = await renderGuide("kokyo");
    expect(normal).toMatch(/アクセスを確認|スタート地点を決める/);
    expect(normal).not.toContain("通行止め情報を確認");
  });

  it.each(Object.keys(courseAtmospheres))(
    "shows disclosed AI reference scenes and mapped distance controls for %s",
    async (slug) => {
      const html = await renderGuide(slug);
      const section = html.slice(html.indexOf('<section id="highlights"'));
      expect(section).toContain("コースの雰囲気");
      expect(section.match(/<figure/g)).toHaveLength(courseAtmospheres[slug].scenes.length);
      const scenes = courseAtmospheres[slug].scenes;
      const official = scenes.filter((scene) => scene.referenceType === "official-photo").length;
      expect(section).toContain(
        official ? "現地の写真を参考にしたAI生成イメージ" : "ストリートビューを参考にしたAI生成イメージ",
      );
      expect(section.match(/AI生成の参考イメージ<\/p>/g)).toHaveLength(courseAtmospheres[slug].scenes.length);
      expect(section.match(/の地点をコース地図で見る/g) ?? []).toHaveLength(
        scenes.filter((scene) => scene.coursePoint).length,
      );
      expect(section.match(/参考地点を地図で見る/g) ?? []).toHaveLength(scenes.length - official);
      expect(section.match(/参考にした公式写真を見る/g) ?? []).toHaveLength(official);
      expect(section).not.toContain("からの順番");
      expect(section).not.toContain("wikimedia.org");
      expect(section).not.toContain("・0.0km");
      if (slug === "kokyo") {
        expect(section).toContain("皇居を反時計回りに走る視点");
        expect(section).toContain("お堀と石垣を左に");
        expect(section).toContain("お堀を左に");
      }
    },
  );

  it("does not invent a mapped position or Street View source for an official facility photograph", () => {
    const html = renderToStaticMarkup(
      createElement(CourseAtmosphere, {
        atmosphere: {
          scenes: [
            {
              id: "official",
              title: "競技場の全景",
              description: "公式写真を参考にした全景",
              imageSrc: "/course-atmosphere/example.webp",
              referenceUrl: "https://www.tef.or.jp/tmg/stadium/index.html",
              referenceType: "official-photo",
              referenceTitle: "東京体育館",
            },
          ],
        },
        onSelectPoint: () => {},
      }),
    );
    expect(html).toContain("現地の写真を参考にしたAI生成イメージ");
    expect(html).toContain("参考にした公式写真を見る");
    expect(html).not.toContain("コース上で見る");
    expect(html).not.toContain("ストリートビュー");
  });

  it("omits empty photo sections and generic substitute cards while keeping route and access controls", async () => {
    const html = await renderGuide("hattori-ryokuchi", true);
    expect(html).not.toContain('id="highlights"');
    expect(html).not.toContain("区間ごとの確認ポイント");
    expect(html).not.toContain("wikimedia.org");
    expect(html).toContain('id="route"');
    expect(html).toContain("アクセスを確認");
  });

  it("keeps the reviewed landmark gallery and source credits when AI scenes are absent", async () => {
    const html = await renderGuide("kamakura-issyu-trail", true);
    expect(html).toContain('id="highlights"');
    expect(html).toContain("六国見山");
    expect(html).toContain("CC BY-SA 3.0");
    expect(html).toContain("File:Rokkokuken_san_01.JPG");
  });
});
