import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { getCourseGuide } from "@/lib/course-guides";
import { LongCourseGuide } from "@/components/long-course-guide";
import { courseAtmospheres } from "@/lib/course-atmosphere";

vi.mock("@/components/map/course-guide-map", () => ({ CourseGuideMap: () => null }));
vi.mock("@/components/member-gpx-link", () => ({ MemberGpxLink: () => null }));
vi.mock("@/components/elevation-profile", () => ({ ElevationProfile: () => null }));

async function renderGuide(slug: string) {
  const guide = await getCourseGuide(slug);
  if (!guide) throw new Error(`Missing guide: ${slug}`);
  return renderToStaticMarkup(
    createElement(LongCourseGuide, {
      guide,
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
  it.each(Object.keys(courseAtmospheres))(
    "shows labeled reference scenes for %s without photo distance claims",
    async (slug) => {
      const html = await renderGuide(slug);
      const section = html.slice(html.indexOf('<section id="highlights"'));
      expect(section).toContain("コースの雰囲気");
      expect(section.match(/<figure/g)).toHaveLength(2);
      expect(section.match(/AI生成の参考イメージ<\/p>/g)).toHaveLength(2);
      expect(section.match(/参考地点を地図で見る/g)).toHaveLength(2);
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

  it("omits empty photo sections and generic substitute cards while keeping route and access controls", async () => {
    const html = await renderGuide("hattori-ryokuchi");
    expect(html).not.toContain('id="highlights"');
    expect(html).not.toContain("区間ごとの確認ポイント");
    expect(html).not.toContain("wikimedia.org");
    expect(html).toContain('id="route"');
    expect(html).toContain("スタート地点を決める");
  });

  it("keeps the reviewed landmark gallery and source credits", async () => {
    const html = await renderGuide("kamakura-issyu-trail");
    expect(html).toContain('id="highlights"');
    expect(html).toContain("六国見山");
    expect(html).toContain("CC BY-SA 3.0");
    expect(html).toContain("File:Rokkokuken_san_01.JPG");
  });
});
