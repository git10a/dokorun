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
  { path: "/spots/kokyo", marker: "皇居" },
  { path: "/spot-gpx/kokyo.gpx", marker: "<gpx" },
  { path: "/api/spots/kokyo/gpx", marker: "<gpx" },
];

async function check(testCase) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const headers = versionId
      ? { "Cloudflare-Workers-Version-Overrides": `dokorun="${versionId}"` }
      : undefined;
    const response = await fetch(`${baseUrl}${testCase.path}`, {
      headers,
      redirect: "follow",
      signal: controller.signal,
    });
    const body = await response.text();
    if (!response.ok || /error code:\s*110[12]/i.test(body) || (testCase.marker && !body.includes(testCase.marker))) {
      throw new Error(`${testCase.path} status=${response.status} cf-ray=${response.headers.get("cf-ray") ?? "-"} body=${body.slice(0, 300)}`);
    }
    return `${testCase.path} ${response.status} cf-ray=${response.headers.get("cf-ray") ?? "-"}`;
  } finally {
    clearTimeout(timeout);
  }
}

for (let iteration = 0; iteration < iterations; iteration += 1) {
  for (const testCase of cases) console.log(await check(testCase));
}

await Promise.all(Array.from({ length: Math.min(20, iterations * 2) }, async (_, index) => {
  const result = await check(cases[index % cases.length]);
  console.log(`concurrent ${result}`);
}));

console.log(`Smoke passed: version=${versionId ?? "active"} iterations=${iterations}`);
