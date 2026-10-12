import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { Instrumentation } from "next";

export const onRequestError: Instrumentation.onRequestError = async (_error, request, context) => {
  let version: WorkerVersionMetadata | undefined;
  try {
    version = getCloudflareContext().env.CF_VERSION_METADATA;
  } catch {
    // Node buildやリクエストコンテキスト外ではversion bindingが無い。
  }

  console.error(
    JSON.stringify({
      event: "request_error",
      method: request.method,
      versionId: version?.id,
      versionTag: version?.tag,
      routePath: context.routePath,
      routeType: context.routeType,
      revalidateReason: context.revalidateReason,
      error: "request_failed",
    }),
  );
};
