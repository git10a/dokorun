export const analyticsEventNames = new Set(
  "area_view checkin_detail_cta course_guide_view directions feature_view feedback footer_checkin_cta gpx_download gpx_guide gpx_help gpx_intent hashiritai lines_near_click lines_near_result pace_plan_copy pace_plan_create pace_plan_print race_day_link race_review_saved race_review_started race_review_view race_search race_view route_start search search_fallback search_results share sort_near spot_edit_view spot_race_link spot_view start_point_select start_recommendation today_location_result today_run_choice".split(
    " ",
  ),
);
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const slugKeys = new Set(["slug", "race", "spot", "feature", "startId", "tags"]);
const boolKeys = new Set(["internal", "loggedIn", "hit", "hasQuery", "filtered", "edited", "finished", "hills"]);
const numericKeys = new Set(["total", "page", "targetMin", "splitPercent", "hillEffort", "fallbackCount"]);
const enums: Record<string, string[]> = {
  choice: ["thirty_minutes", "no_signals", "scenic", "near"],
  result: ["success", "error"],
  category: ["contact", "spot_request"],
  channel: ["copy", "x", "line"],
  sort: ["near", "new", "popular", "distance_asc", "distance_desc"],
  type: ["loop", "out_and_back", "one_way", "track"],
  dist: ["0-3", "3-5", "5-10", "10-"],
  destination: ["google_maps"],
  originMode: ["station", "none"],
  source: ["manual", "recommendation", "map", "list"],
  kind: ["start", "finish", "reception", "bag_drop", "expo"],
};
export function analyticsPath(input: unknown) {
  if (typeof input !== "string") return null;
  const path = input.split(/[?#]/, 1)[0];
  if (/^\/(spots|races|features|areas)\/[a-z0-9-]{1,100}$/.test(path)) return path;
  const section = path.split("/")[1];
  return [
    "",
    "spots",
    "races",
    "features",
    "areas",
    "guide",
    "contact",
    "about",
    "privacy",
    "login",
    "me",
    "u",
    "stories",
  ].includes(section)
    ? `/${section}`
    : null;
}
export function sanitizeAnalyticsMeta(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};
  const output: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if ((key === "visitorId" || key === "sessionId") && typeof value === "string" && uuid.test(value))
      output[key] = value;
    else if (boolKeys.has(key) && typeof value === "boolean") output[key] = value;
    else if (slugKeys.has(key) && typeof value === "string" && /^[a-z0-9,-]{1,100}$/.test(value)) output[key] = value;
    else if (
      numericKeys.has(key) &&
      typeof value === "number" &&
      Number.isFinite(value) &&
      value >= 0 &&
      value <= 100000
    )
      output[key] = value;
    else if (enums[key]?.includes(String(value))) output[key] = value;
    else if (
      key === "referrerHost" &&
      typeof value === "string" &&
      /^(www\.)?(google\.com|google\.co\.jp|bing\.com|search\.yahoo\.co\.jp|t\.co|instagram\.com|dokorun\.com)$/.test(
        value,
      )
    )
      output[key] = value;
  }
  return output;
}
