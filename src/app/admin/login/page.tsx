import type { Metadata } from "next";
import { LoginForm } from "@/components/admin/login-form";

export const metadata: Metadata = { title: "運営ログイン", robots: { index: false, follow: false } };

export default function AdminLoginPage() {
  return <div className="mx-auto max-w-sm px-4 py-20"><h1 className="text-2xl font-bold">運営ログイン</h1><p className="mt-2 text-sm text-sub">スポットの登録・編集を行います。</p><LoginForm /></div>;
}
