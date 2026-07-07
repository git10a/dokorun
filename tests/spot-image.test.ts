import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it } from "vitest";
import { imageTransformUrl, SpotImage } from "@/components/spot-image";

const previousTransformSetting = process.env.NEXT_PUBLIC_IMAGE_TRANSFORM;

afterEach(() => {
  process.env.NEXT_PUBLIC_IMAGE_TRANSFORM = previousTransformSetting;
});

describe("SpotImage", () => {
  it("renders responsive, lazy-loaded image attributes", () => {
    process.env.NEXT_PUBLIC_IMAGE_TRANSFORM = "off";
    const html = renderToStaticMarkup(createElement(SpotImage, {
      src: "https://images.example/spot.jpg",
      alt: "コース写真",
      width: 640,
      height: 360,
      sizes: "128px",
    }));
    expect(html).toContain('width="640"');
    expect(html).toContain('height="360"');
    expect(html).toContain('loading="lazy"');
    expect(html).toContain('decoding="async"');
    expect(html).toContain('srcSet="https://images.example/spot.jpg 320w, https://images.example/spot.jpg 640w"');
    expect(html).toContain('sizes="128px"');
  });

  it("builds a Cloudflare transformation URL", () => {
    delete process.env.NEXT_PUBLIC_IMAGE_TRANSFORM;
    expect(imageTransformUrl("https://images.example/spot.jpg", 1200)).toBe(
      "https://dokorun.com/cdn-cgi/image/format=auto,quality=78,width=1200/https://images.example/spot.jpg",
    );
  });
});
