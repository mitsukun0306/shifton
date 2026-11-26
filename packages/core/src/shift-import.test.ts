import { describe, expect, it } from "vitest";
import { normalizeExtraction, normalizeTime } from "./shift-import";

describe("normalizeTime", () => {
  it("いろいろな表記を HH:mm にそろえる", () => {
    expect(normalizeTime("9:00")).toBe("09:00");
    expect(normalizeTime("17：30")).toBe("17:30");
    expect(normalizeTime("9時")).toBe("09:00");
    expect(normalizeTime("9時30分")).toBe("09:30");
    expect(normalizeTime("22")).toBe("22:00");
  });

  it("24時以降は日またぎとして扱う", () => {
    expect(normalizeTime("24:00")).toBe("00:00");
    expect(normalizeTime("25:30")).toBe("01:30");
  });

  it("読めない値は null", () => {
    expect(normalizeTime("早番")).toBeNull();
    expect(normalizeTime("9:75")).toBeNull();
    expect(normalizeTime("")).toBeNull();
  });
});

describe("normalizeExtraction", () => {
  const shift = {
    date: "2026-12-01",
    startTime: "9:00",
    endTime: "17:00",
    breakMinutes: 60,
    note: null,
    confidence: "high" as const,
  };

  it("候補を正規化し、日付順に並べる", () => {
    const { candidates, warnings } = normalizeExtraction({
      personFound: true,
      shifts: [{ ...shift, date: "2026-12-03" }, shift, { ...shift, confidence: "low" }],
      warnings: [],
    });
    expect(warnings).toEqual([]);
    // 同じ内容の重複は1つにまとめる
    expect(candidates).toHaveLength(2);
    expect(candidates[0]).toEqual({
      date: "2026-12-01",
      startTime: "09:00",
      endTime: "17:00",
      breakMinutes: 60,
      note: undefined,
      uncertain: false,
    });
  });

  it("不正な行は候補から外して注意点に入れる", () => {
    const { candidates, warnings } = normalizeExtraction({
      personFound: true,
      shifts: [shift, { ...shift, date: "12/5" }, { ...shift, startTime: "早番" }],
      warnings: ["右端が切れています"],
    });
    expect(candidates).toHaveLength(1);
    expect(warnings).toHaveLength(3);
    expect(warnings[0]).toBe("右端が切れています");
  });

  it("休憩が不明なら0分にする", () => {
    const { candidates } = normalizeExtraction({
      personFound: true,
      shifts: [{ ...shift, breakMinutes: null }],
      warnings: [],
    });
    expect(candidates[0]?.breakMinutes).toBe(0);
  });

  it("本人が見つからない場合は案内を出す", () => {
    const { warnings } = normalizeExtraction({ personFound: false, shifts: [], warnings: [] });
    expect(warnings[0]).toContain("見つかりませんでした");
  });
});
