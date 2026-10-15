const versionId = process.argv[2] || process.env.CF_WORKER_VERSION_ID;
const baseUrl = (process.env.SMOKE_BASE_URL || "https://dokorun.com").replace(/\/$/, "");
const iterations = Number(process.env.SMOKE_ITERATIONS || "5");

if (!Number.isInteger(iterations) || iterations < 1 || iterations > 100) {
  throw new Error("SMOKE_ITERATIONS must be an integer between 1 and 100");
}

const cases = [
  { path: "/healthz.txt", marker: "ok" },
  { path: "/api/health", marker: '"ok":true' },
  { path: "/api/auth/get-session" },
  { path: "/areas/tokyo", marker: "東京都のランニングコース" },
  { path: "/spots/kokyo", marker: "皇居" },
  { path: "/races/tokyo-marathon", marker: "東京マラソン" },
  { path: "/spot-gpx/kokyo.gpx", marker: "<gpx" },
  { path: "/api/spots/kokyo/gpx", marker: "<gpx" },
];

async function check(testCase, pageAssets) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const headers = versionId ? { "Cloudflare-Workers-Version-Overrides": `dokorun="${versionId}"` } : undefined;
    const response = await fetch(`${baseUrl}${testCase.path}`, {
      headers,
      redirect: "follow",
      signal: controller.signal,
    });
    const body = await response.text();
    if (!response.ok || /error code:\s*110[12]/i.test(body) || (testCase.marker && !body.includes(testCase.marker))) {
      throw new Error(
        `${testCase.path} status=${response.status} cf-ray=${response.headers.get("cf-ray") ?? "-"} body=${body.slice(0, 300)}`,
      );
    }
    if (versionId && testCase.path === "/api/health" && JSON.parse(body).version?.id !== versionId) {
      throw new Error(`Worker version mismatch: expected ${versionId}`);
    }
    if (testCase.contentType && !response.headers.get("content-type")?.includes(testCase.contentType)) {
      throw new Error(
        `${testCase.path}: expected ${testCase.contentType}, received ${response.headers.get("content-type")}`,
      );
    }
    if (pageAssets && response.headers.get("content-type")?.includes("text/html")) {
      for (const match of body.matchAll(/(?:src|href)="(\/_next\/static\/[^"?]+\.(?:js|css)(?:\?[^" ]*)?)"/g)) {
        pageAssets.add(match[1]);
      }
    }
    return `${testCase.path} ${response.status} cf-ray=${response.headers.get("cf-ray") ?? "-"}`;
  } finally {
    clearTimeout(timeout);
  }
}

for (let iteration = 0; iteration < iterations; iteration += 1) {
  const pageAssets = new Set();
  for (const testCase of cases) console.log(await check(testCase, pageAssets));
  if (pageAssets.size === 0) throw new Error("No page assets found; HTML verification is incomplete");
  // HTML 200 alone does not prove the page can run after a version switch.
  for (const path of pageAssets) {
    console.log(
      await check({ path, contentType: new URL(path, baseUrl).pathname.endsWith(".js") ? "javascript" : "text/css" }),
    );
  }
}

// Static Assetsは0% deploymentのVersion Overrideが常に適用されるとは限らないため、
// 並列負荷試験は必ずWorkerを通る経路だけに限定する。静的経路は上の逐次確認で検証する。
const concurrentCases = cases.filter(({ path }) => path !== "/healthz.txt" && path !== "/spot-gpx/kokyo.gpx");
await Promise.all(
  Array.from({ length: Math.min(20, iterations * 2) }, async (_, index) => {
    const result = await check(concurrentCases[index % concurrentCases.length]);
    console.log(`concurrent ${result}`);
  }),
);

console.log(`Smoke passed: version=${versionId ?? "active"} iterations=${iterations}`);
