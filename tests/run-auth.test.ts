import { describe, expect, it } from "vitest";
import { assertRunOwnership } from "@/lib/run-auth";

describe("ドコログの認可", () => {
  it("本人の記録は変更できる", () => {
    expect(() => assertRunOwnership("user-a", "user-a")).not.toThrow();
  });

  it("他人の記録はAction直呼びでも拒否する", () => {
    expect(() => assertRunOwnership("owner", "attacker")).toThrow("権限がありません");
  });
});

