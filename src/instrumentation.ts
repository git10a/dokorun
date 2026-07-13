import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { Instrumentation } from "next";

function firstHeader(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function errorDetails(error: unknown) {
  if (!(error instanceof Error)) return { name: "UnknownError", message: String(error) };
  return {
    name: error.name,
    message: error.message,
    stack: error.stack,
    cause: error.cause instanceof Error ? `${error.cause.name}: ${error.cause.message}` : error.cause,
  };
}

export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  let version: WorkerVersionMetadata | undefined;
  try {
    version = getCloudflareContext().env.CF_VERSION_METADATA;
  } catch {
    // Node buildやリクエストコンテキスト外ではversion bindingが無い。
  }

  console.error(JSON.stringify({
    event: "request_error",
    path: request.path,
    method: request.method,
    cfRay: firstHeader(request.headers["cf-ray"]),
    versionId: version?.id,
    versionTag: version?.tag,
    routePath: context.routePath,
    routeType: context.routeType,
    revalidateReason: context.revalidateReason,
    error: errorDetails(error),
  }));
};
