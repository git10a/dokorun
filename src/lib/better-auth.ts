import { and, eq } from "drizzle-orm";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { canCacheRequestExternalDb, getDb } from "@/db";
import * as schema from "@/db/schema";

function handleBase(email: string) {
  const normalized = email.split("@")[0]?.normalize("NFKD").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") ?? "";
  return (normalized || "runner").slice(0, 24);
}

async function availableHandle(email: string) {
  const db = getDb();
  const base = handleBase(email);
  const existing = await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.handle, base)).limit(1);
  if (!existing[0]) return base;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const suffix = crypto.randomUUID().replaceAll("-", "").slice(0, 6);
    const candidate = `${base.slice(0, 23)}-${suffix}`;
    const conflict = await db.select({ id: schema.users.id }).from(schema.users).where(and(eq(schema.users.handle, candidate))).limit(1);
    if (!conflict[0]) return candidate;
  }
  return `runner-${crypto.randomUUID().replaceAll("-", "").slice(0, 12)}`;
}

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

export const isGoogleAuthConfigured = Boolean(googleClientId && googleClientSecret);

function buildAuth() {
  return betterAuth({
  appName: "ドコラン",
  baseURL: process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  secret: process.env.BETTER_AUTH_SECRET || "dokorun-local-development-secret-change-me",
  database: drizzleAdapter(getDb(), {
    provider: "pg",
    schema,
    usePlural: true,
    // Workers の neon-http はトランザクション非対応。Better Auth は複数操作を順次実行する。
    transaction: false,
  }),
  session: {
    // 署名付きcookieで5分だけセッションDB照会を省く。サインアウト後の他タブ反映は最大5分遅れる。
    cookieCache: { enabled: true, maxAge: 300 },
  },
  advanced: {
    database: { generateId: () => crypto.randomUUID() },
    cookiePrefix: "dokorun",
    ipAddress: { ipAddressHeaders: ["cf-connecting-ip"] },
  },
  socialProviders: isGoogleAuthConfigured ? {
    google: {
      clientId: googleClientId!,
      clientSecret: googleClientSecret!,
    },
  } : {},
  user: {
    additionalFields: {
      // required:true にするとソーシャルサインアップ時に databaseHooks で
      // handle を生成する前のバリデーションで handle_is_required になる。
      // DB側は NOT NULL のまま、生成は下の before フックが保証する
      handle: { type: "string", required: false, input: false },
      bio: { type: "string", required: false, input: false },
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => ({
          data: { ...user, handle: await availableHandle(user.email), bio: null },
        }),
      },
    },
  },
  });
}

let cachedAuth: ReturnType<typeof buildAuth> | undefined;

export function createAuth() {
  if (!canCacheRequestExternalDb()) return buildAuth();
  cachedAuth ??= buildAuth();
  return cachedAuth;
}

// Better Auth CLIのスキーマ生成用。実リクエストではcreateAuth()を使い、
// workerd上でローカルDB接続がリクエスト間共有されないようにする。
export const auth = createAuth();
