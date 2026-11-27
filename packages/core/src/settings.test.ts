import { describe, expect, it } from "vitest";
import {
  breakForRules,
  defaultSettings,
  describeBreakRules,
  isBreakLegal,
  isLegalBreakRules,
  legalBreakRules,
  parseSettings,
} from "./settings";

describe("settings", () => {
  it("既定値は法定の休憩ルール", () => {
    expect(isLegalBreakRules(defaultSettings.breakRules)).toBe(true);
    expect(defaultSettings.breakOptions).toEqual([0, 15, 30, 45, 60, 90]);
    expect(defaultSettings.presetCount).toBe(4);
  });

  it("自分で決めたルールで休憩を決める", () => {
    const rules = [
      { overMinutes: 4 * 60, breakMinutes: 30 },
      { overMinutes: 7 * 60, breakMinutes: 60 },
    ];
    expect(breakForRules("10:00", "14:00", rules)).toBe(0);
    expect(breakForRules("10:00", "15:00", rules)).toBe(30);
    expect(breakForRules("09:00", "17:00", rules)).toBe(60);
    expect(breakForRules("09:00", "17:00", [])).toBe(0);
    expect(breakForRules("09:00", "18:00", legalBreakRules)).toBe(60);
  });

  it("休憩が法律を満たしているか判定する", () => {
    expect(isBreakLegal("10:00", "16:30", 30)).toBe(true); // 労働6時間ちょうど
    expect(isBreakLegal("10:00", "17:00", 30)).toBe(false); // 労働6時間30分
    expect(isBreakLegal("10:00", "17:00", 45)).toBe(true);
    expect(isBreakLegal("09:00", "18:00", 45)).toBe(false); // 労働8時間15分
    expect(isBreakLegal("09:00", "18:00", 60)).toBe(true);
  });

  it("壊れた保存値は既定値に戻す", () => {
    expect(parseSettings({ presetCount: "abc" })).toEqual(defaultSettings);
    expect(parseSettings(null)).toEqual(defaultSettings);
    expect(parseSettings({ presetCount: 2 }).presetCount).toBe(2);
  });

  it("ルールを文章にする", () => {
    expect(describeBreakRules(legalBreakRules)).toBe("6時間超→45分、8時間超→60分");
    expect(describeBreakRules([{ overMinutes: 270, breakMinutes: 30 }])).toBe("4時間30分超→30分");
  });
});
