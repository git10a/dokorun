import { afterEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { RaceStoryArticle } from "@/components/race-story";
import { getPublishedStories, getPublishedStory, isPublishedStory, raceStories } from "@/lib/race-stories";

import StoryPreview, { metadata as previewMetadata } from "@/app/preview/stories/[slug]/page";
import StoryPage, { generateMetadata } from "@/app/stories/[slug]/page";

afterEach(() => vi.unstubAllEnvs());
const params = () => Promise.resolve({ slug: "yokohama-2026" });

describe("article publication boundaries", () => {
  it("never publishes a sample, even if its status and date are accidentally set", async () => {
    expect(getPublishedStories()).toEqual([]);
    expect(getPublishedStory("yokohama-2026")).toBeUndefined();
    expect(isPublishedStory({ ...raceStories[0], status: "published", publishedAt: "2026-10-12" })).toBe(false);
    await expect(StoryPage({ params: params() })).rejects.toThrow();
    await expect(generateMetadata({ params: params() })).rejects.toThrow();
  });
  it("requires both publication and a date for a real article", () => {
    expect(isPublishedStory({ ...raceStories[0], isSample: false })).toBe(false);
    expect(isPublishedStory({ ...raceStories[0], isSample: false, status: "published" })).toBe(false);
    expect(isPublishedStory({ ...raceStories[0], isSample: false, status: "published", publishedAt: "2026-10-12" })).toBe(true);
  });
  it("blocks every production preview", async () => {
    vi.stubEnv("NODE_ENV", "production");
    await expect(StoryPreview({ params: params() })).rejects.toThrow();
    expect(previewMetadata.robots).toMatchObject({ index: false, follow: false });
  });
  it("supports local preview, while unknown slugs remain unavailable", async () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(renderToStaticMarkup(await StoryPreview({ params: params() }))).toContain("横浜マラソン");
    await expect(StoryPreview({ params: Promise.resolve({ slug: "missing" }) })).rejects.toThrow();
  });
  it("has working in-page targets and no fake checkout or attributed interview", () => {
    const html = renderToStaticMarkup(createElement(RaceStoryArticle, { story: raceStories[0], preview: true }));
    for (const id of ["story", "course", "preparation", "strategy"]) {
      expect(html).toContain(`href="#${id}"`);
      expect(html).toContain(`id="${id}"`);
    }
    expect(html).toContain('/races/yokohama-marathon#pace');
    expect(html).toContain('/races/yokohama-marathon#course-map');
    expect(html).not.toMatch(/<blockquote|checkout|buy\.stripe|購入する|blur-/);
  });
  it("escapes future interview text rather than executing embedded HTML", () => {
    const story = { ...raceStories[0], sections: [{ id: "safe", title: "Test", paragraphs: ['<script>alert(1)</script>'], quote: { text: '<img src=x onerror=alert(1)>', speaker: "取材先" } }] };
    const html = renderToStaticMarkup(createElement(RaceStoryArticle, { story }));
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;img");
  });
});
