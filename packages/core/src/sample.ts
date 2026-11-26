import type { Member, Shift, Store } from "./schemas";

/** 画面の雛形確認用のサンプルデータ（バックエンド接続までの仮データ） */
export const sampleStore: Store = {
  id: "store-1",
  name: "カフェしふとん 渋谷店",
  timezone: "Asia/Tokyo",
};

export const sampleMembers: Member[] = [
  { id: "m-1", storeId: "store-1", displayName: "佐藤 店長", role: "manager", hourlyWage: null },
  { id: "m-2", storeId: "store-1", displayName: "鈴木 はるか", role: "staff", hourlyWage: 1200 },
  { id: "m-3", storeId: "store-1", displayName: "田中 そうた", role: "staff", hourlyWage: 1150 },
];

export const sampleShifts: Shift[] = [
  {
    id: "s-1",
    storeId: "store-1",
    memberId: "m-1",
    date: "2026-12-01",
    startTime: "09:00",
    endTime: "18:00",
    breakMinutes: 60,
    status: "published",
  },
  {
    id: "s-2",
    storeId: "store-1",
    memberId: "m-2",
    date: "2026-12-01",
    startTime: "10:00",
    endTime: "15:00",
    breakMinutes: 0,
    status: "published",
  },
  {
    id: "s-3",
    storeId: "store-1",
    memberId: "m-3",
    date: "2026-12-01",
    startTime: "17:00",
    endTime: "22:00",
    breakMinutes: 0,
    status: "draft",
  },
  {
    id: "s-4",
    storeId: "store-1",
    memberId: "m-2",
    date: "2026-12-02",
    startTime: "12:00",
    endTime: "20:30",
    breakMinutes: 45,
    status: "draft",
  },
];
