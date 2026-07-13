"use client";

import { useSyncExternalStore } from "react";

const locationChangeEvent = "dokorun:location-search-change";
let historyPatched = false;

function patchHistoryEvents() {
  if (historyPatched) return;
  historyPatched = true;
  const originalPushState = window.history.pushState.bind(window.history);
  const originalReplaceState = window.history.replaceState.bind(window.history);
  window.history.pushState = (...args) => {
    originalPushState(...args);
    window.dispatchEvent(new Event(locationChangeEvent));
  };
  window.history.replaceState = (...args) => {
    originalReplaceState(...args);
    window.dispatchEvent(new Event(locationChangeEvent));
  };
}

function subscribe(onStoreChange: () => void) {
  patchHistoryEvents();
  window.addEventListener("popstate", onStoreChange);
  window.addEventListener(locationChangeEvent, onStoreChange);
  return () => {
    window.removeEventListener("popstate", onStoreChange);
    window.removeEventListener(locationChangeEvent, onStoreChange);
  };
}

export function useLocationSearch() {
  return useSyncExternalStore(subscribe, () => window.location.search, () => "");
}
