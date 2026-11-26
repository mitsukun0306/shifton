import { describe, expect, it } from "vitest";
import { credentialsSchema, translateAuthError } from "./auth";
import { createStoreInputSchema } from "./stores";

describe("auth", () => {
  it("ログイン情報を検証する", () => {
    expect(
      credentialsSchema.safeParse({ email: "a@example.com", password: "12345678" }).success,
    ).toBe(true);
    expect(credentialsSchema.safeParse({ email: "a", password: "12345678" }).success).toBe(false);
    expect(credentialsSchema.safeParse({ email: "a@example.com", password: "short" }).success).toBe(
      false,
    );
  });

  it("エラーメッセージを日本語にする", () => {
    expect(translateAuthError("Invalid login credentials")).toBe(
      "メールアドレスまたはパスワードが違います",
    );
    expect(translateAuthError("unknown")).toBe("unknown");
  });

  it("店舗作成の入力を検証して前後の空白を除く", () => {
    expect(createStoreInputSchema.parse({ storeName: " 渋谷店 ", ownerName: "佐藤" })).toEqual({
      storeName: "渋谷店",
      ownerName: "佐藤",
    });
    expect(createStoreInputSchema.safeParse({ storeName: " ", ownerName: "佐藤" }).success).toBe(
      false,
    );
  });
});
