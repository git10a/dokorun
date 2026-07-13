import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
import bundleAnalyzer from "@next/bundle-analyzer";

initOpenNextCloudflareForDev();

const nextConfig: NextConfig = {
  experimental: {
    serverActions: { bodySizeLimit: "3mb" },
  },
  // Turbopackはルートごとのサーバーチャンクに依存を複製するため、OpenNextが全ルートを
  // 1つのWorkerに束ねると重い依存が最大7〜19回重複し、無料プランの3MiB制限を超える。
  // ここで外部化した依存はOpenNext(esbuild)がnext/react-domと同様に1回だけ同梱する。
  // 注: better-auth は外部化するとSSR中の better-auth/react が別Reactインスタンスを
  // 参照して useRef null で落ちるため外部化しない(依存の kysely/jose は単独で外部化可)
  serverExternalPackages: [
    "drizzle-orm",
    "kysely",
    "jose",
    "zod",
  ],
};

export default bundleAnalyzer({ enabled: process.env.ANALYZE === "true" })(nextConfig);
