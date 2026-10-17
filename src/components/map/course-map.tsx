"use client";

import { useEffect, useRef } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import "./map.css";
import { addPoiEmphasis } from "./poi-emphasis";
import { loadMapLibre } from "./load-maplibre";
import type { LineString } from "@/lib/types";
import { track } from "@/lib/track";

export function CourseMap({
  lat,
  lng,
  geojson,
  highlightedPoint,
  highlightedLabel,
  showEndpoints = false,
  raceSlug,
  className = "h-[340px]",
}: {
  lat: number;
  lng: number;
  geojson: LineString | null;
  name?: string;
  highlightedPoint?: [number, number] | null;
  highlightedLabel?: string | null;
  showEndpoints?: boolean;
  raceSlug?: string;
  className?: string;
}) {
  const container = useRef<HTMLDivElement>(null);
  const selectPoint = useRef<((point: [number, number] | null, label: string | null) => void) | null>(null);
  const latestSelection = useRef({ point: highlightedPoint ?? null, label: highlightedLabel ?? null });
  useEffect(() => {
    latestSelection.current = { point: highlightedPoint ?? null, label: highlightedLabel ?? null };
    selectPoint.current?.(latestSelection.current.point, latestSelection.current.label);
  }, [highlightedPoint, highlightedLabel]);
  useEffect(() => {
    if (!container.current) return;
    let map: import("maplibre-gl").Map | undefined;
    let disposed = false;
    void loadMapLibre().then((maplibregl) => {
      if (disposed || !container.current) return;
      map = new maplibregl.Map({
        container: container.current,
        style: "https://tiles.openfreemap.org/styles/liberty",
        center: [lng, lat],
        zoom: 13,
      });
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
      map.on("load", () => {
        if (!map || disposed) return;
        void addPoiEmphasis(map);
        const bounds = new maplibregl.LngLatBounds();
        const padding = showEndpoints ? { top: 104, bottom: 88, left: 64, right: 64 } : 48;
        if (geojson) {
          map.addSource("course", { type: "geojson", data: geojson });
          map.addLayer({
            id: "course",
            type: "line",
            source: "course",
            paint: { "line-color": "#1A1A1A", "line-width": 4, "line-opacity": 0.85 },
          });
          geojson.coordinates.forEach((coordinate) => bounds.extend(coordinate));
          map.fitBounds(bounds, { padding, maxZoom: 16, duration: 0 });
        }
        let positionEndpointLabels: (() => void) | undefined;
        if (showEndpoints && geojson?.coordinates.length) {
          const start = geojson.coordinates[0];
          const finish = geojson.coordinates[geojson.coordinates.length - 1];
          let activePopup: import("maplibre-gl").Popup | undefined;
          const labels = [start, finish].map((point, index) => {
            const label = index === 0 ? "スタート" : "ゴール";
            const marker = document.createElement("button");
            marker.type = "button";
            marker.className = `course-endpoint course-endpoint--${index === 0 ? "start" : "finish"}`;
            marker.setAttribute("aria-label", `${label}地点の地図を開く`);
            marker.setAttribute("aria-expanded", "false");
            const text = document.createElement("span");
            text.className = "course-endpoint__label";
            text.textContent = label;
            text.setAttribute("aria-hidden", "true");
            marker.appendChild(text);
            const content = document.createElement("div");
            content.className = "course-endpoint-popup";
            const heading = document.createElement("strong");
            heading.textContent = `${label}地点`;
            const link = document.createElement("a");
            link.href = `https://www.google.com/maps/search/?api=1&query=${point[1]},${point[0]}`;
            link.target = "_blank";
            link.rel = "noopener noreferrer";
            link.textContent = "Googleマップで開く";
            const externalIcon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            externalIcon.setAttribute("viewBox", "0 0 24 24");
            externalIcon.setAttribute("fill", "none");
            externalIcon.setAttribute("stroke", "currentColor");
            externalIcon.setAttribute("stroke-width", "1.75");
            externalIcon.setAttribute("stroke-linecap", "round");
            externalIcon.setAttribute("stroke-linejoin", "round");
            externalIcon.setAttribute("aria-hidden", "true");
            externalIcon.innerHTML =
              '<path d="M15 3h6v6M10 14 21 3M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5"/>';
            link.appendChild(externalIcon);
            link.addEventListener("click", () => {
              if (raceSlug) track("race_day_link", { race: raceSlug, kind: index === 0 ? "start" : "finish" });
            });
            content.appendChild(heading);
            content.appendChild(link);
            const popup = new maplibregl.Popup({
              offset: 20,
              maxWidth: "260px",
              focusAfterOpen: false,
              className: "course-endpoint-popover",
            })
              .setLngLat(point)
              .setDOMContent(content);
            popup.on("open", () => marker.setAttribute("aria-expanded", "true"));
            popup.on("close", () => {
              marker.setAttribute("aria-expanded", "false");
              if (activePopup === popup) activePopup = undefined;
            });
            content.addEventListener("keydown", (event) => {
              if (event.key === "Escape") {
                popup.remove();
                marker.focus();
              }
            });
            marker.addEventListener("click", (event) => {
              event.stopPropagation();
              if (popup.isOpen()) popup.remove();
              else {
                activePopup?.remove();
                activePopup = popup;
                popup.addTo(map!);
                if (event.detail === 0) link.focus();
              }
            });
            new maplibregl.Marker({ element: marker }).setLngLat(point).addTo(map!);
            return text;
          });
          // 発着点が近くても読めるよう、画面上で上側の地点は上、下側は下にラベルを出す。
          positionEndpointLabels = () => {
            if (!map) return;
            const startAbove = map.project(start).y <= map.project(finish).y;
            labels[0].classList.toggle("course-endpoint__label--below", !startAbove);
            labels[1].classList.toggle("course-endpoint__label--below", startAbove);
            // Keep nearby start/finish labels readable when a distance is selected.
            const selected = container.current?.querySelector(".course-selected-point__label");
            if (!selected) return;
            const selectedRect = selected.getBoundingClientRect();
            for (const label of labels) {
              const rect = label.getBoundingClientRect();
              if (
                rect.left < selectedRect.right &&
                rect.right > selectedRect.left &&
                rect.top < selectedRect.bottom &&
                rect.bottom > selectedRect.top
              ) {
                label.classList.toggle("course-endpoint__label--below");
              }
            }
          };
          positionEndpointLabels();
          map.on("move", positionEndpointLabels);
        } else {
          const marker = document.createElement("div");
          marker.className = "h-5 w-5 rounded-full border-[3px] border-white bg-[#2BA84A] shadow";
          new maplibregl.Marker({ element: marker }).setLngLat([lng, lat]).addTo(map);
        }
        let selectedMarker: import("maplibre-gl").Marker | undefined;
        let selectedLabel: HTMLSpanElement | undefined;
        selectPoint.current = (point, label) => {
          if (!map) return;
          if (point) {
            if (!selectedMarker) {
              const element = document.createElement("div");
              element.className = "course-selected-point";
              selectedLabel = document.createElement("span");
              selectedLabel.className = "course-selected-point__label";
              element.appendChild(selectedLabel);
              selectedMarker = new maplibregl.Marker({ element });
              selectedMarker.getElement().setAttribute("role", "img");
            }
            selectedMarker.getElement().setAttribute("aria-label", label ?? "選択したコース地点");
            if (selectedLabel) {
              selectedLabel.textContent = label ?? "";
              selectedLabel.hidden = !label;
            }
            selectedMarker.setLngLat(point).addTo(map);
            // 拡大はせず印だけ動かす(戻す操作を不要にする)。手で拡大していて画面外に出たときだけ寄せる
            if (!map.getBounds().contains(point)) map.jumpTo({ center: point });
          } else {
            selectedMarker?.remove();
            if (geojson) map.fitBounds(bounds, { padding, maxZoom: 16, duration: 0 });
          }
          positionEndpointLabels?.();
        };
        if (latestSelection.current.point)
          selectPoint.current(latestSelection.current.point, latestSelection.current.label);
      });
    });
    return () => {
      disposed = true;
      selectPoint.current = null;
      map?.remove();
    };
  }, [geojson, lat, lng, showEndpoints, raceSlug]);
  return (
    <div
      ref={container}
      className={`maplibregl-map ${className} w-full overflow-hidden rounded-2xl border border-line bg-cream`}
      aria-label="コース地図"
    />
  );
}
