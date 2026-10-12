import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { getDb, type Database } from "@/db";
import * as schema from "@/db/schema";

import { authSecret, discardedProviderCredentials, privateProfileDefaults } from "./auth-privacy";

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

export const isGoogleAuthConfigured = Boolean(googleClientId && googleClientSecret);

export function buildAuth(db: Database) {
  return betterAuth({
    appName: "どこラン",
    baseURL: process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
    secret: authSecret(),
    logger: { disabled: true },
    disabledPaths: ["/get-access-token", "/refresh-token", "/account-info"],
    account: { encryptOAuthTokens: true, storeAccountCookie: false, accountLinking: { updateUserInfoOnLink: false } },
    database: drizzleAdapter(db, {
      provider: "sqlite",
      schema,
      usePlural: true,
      // D1は対話的トランザクション非対応。Better Auth は複数操作を順次実行する。
      transaction: false,
    }),
    session: {
      // Revocation/account deletion must take effect on the very next request.
      cookieCache: { enabled: false },
      freshAge: 300,
    },
    advanced: {
      disableOriginCheck: false,
      disableCSRFCheck: false,
      database: { generateId: () => crypto.randomUUID() },
      cookiePrefix: "dokorun",
      ipAddress: { ipAddressHeaders: ["cf-connecting-ip"] },
    },
    socialProviders: isGoogleAuthConfigured
      ? {
          google: {
            clientId: googleClientId!,
            clientSecret: googleClientSecret!,
          },
        }
      : {},
    user: {
      deleteUser: { enabled: true },
      additionalFields: {
        // required:true にするとソーシャルサインアップ時に databaseHooks で
        // handle を生成する前のバリデーションで handle_is_required になる。
        // DB側は NOT NULL のまま、生成は下の before フックが保証する
        handle: { type: "string", required: false, input: false },
        bio: { type: "string", required: false, input: false },
      },
    },
    databaseHooks: {
      account: {
        create: { before: async (account) => ({ data: { ...account, ...discardedProviderCredentials } }) },
        update: { before: async (account) => ({ data: { ...account, ...discardedProviderCredentials } }) },
      },
      session: {
        // Retain in-memory IP rate limiting, but do not persist IP or User-Agent.
        create: { before: async (session) => ({ data: { ...session, ipAddress: null, userAgent: null } }) },
        update: { before: async (session) => ({ data: { ...session, ipAddress: null, userAgent: null } }) },
      },
      user: {
        create: {
          before: async (user) => ({
            data: { ...user, ...privateProfileDefaults() },
          }),
        },
      },
    },
  });
}

// Better AuthのDrizzle Adapterは渡したDBを保持するため、リクエスト間では共有しない。
export function createAuth() {
  return buildAuth(getDb());
}
