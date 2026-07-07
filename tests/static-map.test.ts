import { describe, expect, it } from "vitest";
import { computeStaticMapView, type Coordinate } from "@/lib/static-map";

const kokyo: Coordinate[] = [
  [139.7528, 35.6852],
  [139.7615, 35.6874],
  [139.7639, 35.6812],
  [139.7573, 35.6772],
  [139.7497, 35.6797],
  [139.7528, 35.6852],
];

describe("computeStaticMapView", () => {
  it("fits every route point inside the container with padding", () => {
    for (const [width, height] of [[128, 168], [224, 176], [640, 340]]) {
      const view = computeStaticMapView({ coords: kokyo, width, height, devicePixelRatio: 2, padding: 16 });
      expect(view).not.toBeNull();
      for (const coord of kokyo) {
        const [x, y] = view!.project(coord);
        expect(x).toBeGreaterThanOrEqual(15);
        expect(x).toBeLessThanOrEqual(width - 15);
        expect(y).toBeGreaterThanOrEqual(15);
        expect(y).toBeLessThanOrEqual(height - 15);
      }
    }
  });

  it("covers the whole container with tiles", () => {
    const width = 224;
    const height = 176;
    const view = computeStaticMapView({ coords: kokyo, width, height, devicePixelRatio: 2 })!;
    expect(view.tiles.length).toBeGreaterThan(0);
    expect(view.tiles.length).toBeLessThanOrEqual(12);
    const left = Math.min(...view.tiles.map((tile) => tile.left));
    const top = Math.min(...view.tiles.map((tile) => tile.top));
    const right = Math.max(...view.tiles.map((tile) => tile.left + tile.size));
    const bottom = Math.max(...view.tiles.map((tile) => tile.top + tile.size));
    expect(left).toBeLessThanOrEqual(0);
    expect(top).toBeLessThanOrEqual(0);
    expect(right).toBeGreaterThanOrEqual(width);
    expect(bottom).toBeGreaterThanOrEqual(height);
    for (const tile of view.tiles) {
      expect(tile.x).toBeGreaterThanOrEqual(0);
      expect(tile.x).toBeLessThan(2 ** tile.z);
      expect(tile.y).toBeGreaterThanOrEqual(0);
      expect(tile.y).toBeLessThan(2 ** tile.z);
    }
  });

  it("never upscales tiles and keeps the per-thumbnail tile budget on high-density screens", () => {
    const base = computeStaticMapView({ coords: kokyo, width: 224, height: 176, devicePixelRatio: 1 })!;
    const retina = computeStaticMapView({ coords: kokyo, width: 224, height: 176, devicePixelRatio: 2 })!;
    expect(retina.zoom).toBeGreaterThanOrEqual(base.zoom);
    expect(retina.tiles.length).toBeLessThanOrEqual(12);
    for (const tile of [...base.tiles, ...retina.tiles]) expect(tile.size).toBeLessThanOrEqual(256);
  });

  it("centers on the fallback point at a fixed zoom when there is no route", () => {
    const view = computeStaticMapView({ coords: [], center: [139.7528, 35.6852], width: 224, height: 176, devicePixelRatio: 1 })!;
    expect(view.zoom).toBe(14);
    const [x, y] = view.project([139.7528, 35.6852]);
    expect(x).toBeCloseTo(112, 0);
    expect(y).toBeCloseTo(88, 0);
  });

  it("returns null without route and center or with an empty container", () => {
    expect(computeStaticMapView({ coords: [], width: 224, height: 176 })).toBeNull();
    expect(computeStaticMapView({ coords: kokyo, width: 0, height: 0 })).toBeNull();
  });
});
