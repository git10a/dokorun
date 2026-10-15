import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
import bundleAnalyzer from "@next/bundle-analyzer";

initOpenNextCloudflareForDev();

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: [{ key: "Referrer-Policy", value: "no-referrer" }] }];
  },
  experimental: {
    serverActions: { bodySizeLimit: "3mb" },
    // ビルド用D1スナップショットは単一sqlite。複数workerから同時に開くと
    // SQLITE_BUSY_RECOVERYになるため、静的生成は1 workerで逐次実行する。
    staticGenerationMaxConcurrency: 1,
    staticGenerationMinPagesPerWorker: 1000,
  },
  // 共通依存はOpenNext側で一度だけ束ねる。サーバーのルート間での重複を避ける。
  // better-auth/react はNext側のReactと同じインスタンスが必要なため外部化しない。
  serverExternalPackages: ["drizzle-orm", "kysely", "jose", "zod"],
  // NextのNode向けファイル追跡から漏れる、Workers向けの条件付きexportを含める。
  outputFileTracingIncludes: {
    "/**": ["./node_modules/@better-auth/core/dist/instrumentation/*.mjs"],
  },
  webpack(config, { isServer, nextRuntime }) {
    if (isServer) {
      // useEffect内の動的importもサーバーチャンクに残るため、地図本体を明示的に除外する。
      config.resolve.alias = { ...config.resolve.alias, "maplibre-gl$": false };
    }
    if (isServer && nextRuntime !== "edge") {
      // 認証サーバーだけを共通化する。better-auth/reactはNextのReactと一緒にbundleする。
      const authServerExternal = (
        { request }: { request?: string },
        callback: (error?: Error | null, result?: string) => void,
      ) => {
        if (request === "better-auth" || request === "better-auth/adapters/drizzle") {
          return callback(null, `commonjs ${request}`);
        }
        callback();
      };
      config.externals = [
        authServerExternal,
        ...(Array.isArray(config.externals) ? config.externals : [config.externals]),
      ].filter(Boolean);
    }
    return config;
  },
};

export default bundleAnalyzer({ enabled: process.env.ANALYZE === "true" })(nextConfig);
