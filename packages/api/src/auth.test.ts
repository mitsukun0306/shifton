import { describe, expect, it } from "vitest";
import { credentialsSchema, translateAuthError } from "./auth";
import { shiftInputSchema, toShift } from "./shifts";
import { workplaceInputSchema } from "./workplaces";

describe("auth", () => {
  it("ログイン情報を検証する", () => {
    const ok = { email: "a@example.com", password: "12345678" };
    expect(credentialsSchema.safeParse(ok).success).toBe(true);
    expect(credentialsSchema.safeParse({ ...ok, email: "a" }).success).toBe(false);
    expect(credentialsSchema.safeParse({ ...ok, password: "short" }).success).toBe(false);
  });

  it("エラーメッセージを日本語にする", () => {
    expect(translateAuthError("Invalid login credentials")).toBe(
      "メールアドレスまたはパスワードが違います",
    );
    expect(translateAuthError("unknown")).toBe("unknown");
  });
});

describe("入力の検証", () => {
  it("勤務先: 時給の空欄は未設定として扱う", () => {
    expect(workplaceInputSchema.parse({ name: " カフェ ", hourlyWage: "" })).toEqual({
      name: "カフェ",
      color: "#0284c7",
      hourlyWage: null,
    });
    expect(workplaceInputSchema.parse({ name: "カフェ", hourlyWage: "1200" }).hourlyWage).toBe(
      1200,
    );
    expect(workplaceInputSchema.safeParse({ name: "カフェ", hourlyWage: "-1" }).success).toBe(
      false,
    );
  });

  it("シフト: フォームの文字列を数値に変換する", () => {
    const parsed = shiftInputSchema.parse({
      workplaceId: "wp",
      date: "2026-12-01",
      startTime: "09:00",
      endTime: "17:00",
      breakMinutes: "60",
    });
    expect(parsed.breakMinutes).toBe(60);
    expect(shiftInputSchema.safeParse({ ...parsed, date: "2026/12/01" }).success).toBe(false);
  });

  it("DB の行をドメインモデルに変換する", () => {
    const shift = toShift({
      id: "1",
      user_id: "u",
      workplace_id: "wp",
      date: "2026-12-01",
      start_time: "09:00:00",
      end_time: "17:30:00",
      break_minutes: 0,
      note: null,
      source: "manual",
      created_at: "",
      updated_at: "",
    });
    expect(shift.startTime).toBe("09:00");
    expect(shift.endTime).toBe("17:30");
    expect(shift.note).toBeUndefined();
  });
});
