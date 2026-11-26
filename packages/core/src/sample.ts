import type { Shift, Workplace } from "./schemas";

/** 画面の確認用サンプルデータ（掛け持ちしているアルバイトの例） */
export const sampleWorkplaces: Workplace[] = [
  { id: "wp-1", name: "カフェしふとん", color: "#0284c7", hourlyWage: 1200 },
  { id: "wp-2", name: "コンビニ 駅前店", color: "#16a34a", hourlyWage: 1150 },
];

export const sampleShifts: Shift[] = [
  {
    id: "s-1",
    workplaceId: "wp-1",
    date: "2026-12-01",
    startTime: "10:00",
    endTime: "15:00",
    breakMinutes: 0,
    source: "manual",
  },
  {
    id: "s-2",
    workplaceId: "wp-2",
    date: "2026-12-01",
    startTime: "18:00",
    endTime: "22:00",
    breakMinutes: 0,
    source: "manual",
  },
  {
    id: "s-3",
    workplaceId: "wp-1",
    date: "2026-12-03",
    startTime: "12:00",
    endTime: "20:30",
    breakMinutes: 45,
    source: "manual",
  },
  {
    id: "s-4",
    workplaceId: "wp-2",
    date: "2026-12-03",
    startTime: "20:00",
    endTime: "23:00",
    breakMinutes: 0,
    source: "manual",
  },
];
