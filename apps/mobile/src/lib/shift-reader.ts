import type { NormalizedExtraction } from "@shifton/core";
import Constants from "expo-constants";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { Platform } from "react-native";

/** 開発中、Web 版サーバー（pnpm dev:web）が待ち受けるポート */
const DEV_WEB_PORT = 3000;

/**
 * 読み取り API を持つ Web 版サーバーの URL（例: http://192.168.0.10:3000）を決める。
 *
 * 開発中（Expo Go など）に未設定、または localhost が指定されている場合は、
 * Metro（pnpm dev:mobile）を動かしているパソコンの IP アドレスを使う。
 * スマホから見た localhost はスマホ自身なので、そのままでは届かないため。
 */
export function resolveApiBaseUrl(configured: string, devHostUri?: string | null): string {
  const url = configured.trim().replace(/\/$/, "");
  const devHost = devHostUri?.split(":")[0];
  if (!devHost) return url;
  if (url === "") return `http://${devHost}:${DEV_WEB_PORT}`;
  return url.replace(/^(https?:\/\/)(localhost|127\.0\.0\.1)(?=[:/]|$)/, `$1${devHost}`);
}

const apiBaseUrl = resolveApiBaseUrl(
  process.env.EXPO_PUBLIC_API_BASE_URL ?? "",
  // Web 版の Expo（ブラウザ）ではパソコン上で動くので localhost のままでよい
  __DEV__ && Platform.OS !== "web" ? Constants.expoConfig?.hostUri : null,
);

export const isShiftReaderConfigured = apiBaseUrl !== "";

/** 長辺の最大ピクセル数。文字が読める解像度を保ちつつ、送信サイズを抑える */
const MAX_EDGE = 2000;

/** 写真を縮小して JPEG にする */
async function prepareImage(asset: { uri: string; width: number; height: number }) {
  const longEdge = Math.max(asset.width, asset.height);
  let context = ImageManipulator.manipulate(asset.uri);
  if (longEdge > MAX_EDGE) {
    context =
      asset.width >= asset.height
        ? context.resize({ width: MAX_EDGE })
        : context.resize({ height: MAX_EDGE });
  }
  const image = await context.renderAsync();
  const result = await image.saveAsync({ compress: 0.85, format: SaveFormat.JPEG });
  return result.uri;
}

/** シフト表の画像を送り、読み取り結果（シフトの候補）を受け取る */
export async function readShiftImage(params: {
  asset: { uri: string; width: number; height: number };
  nameOnSheet: string;
  accessToken: string;
}): Promise<NormalizedExtraction> {
  const uri = await prepareImage(params.asset);
  const body = new FormData();
  if (Platform.OS === "web") {
    body.append("image", await (await fetch(uri)).blob(), "shift.jpg");
  } else {
    // React Native の FormData はファイルを { uri, name, type } で渡す
    body.append("image", { uri, name: "shift.jpg", type: "image/jpeg" } as unknown as Blob);
  }
  body.append("nameOnSheet", params.nameOnSheet);

  let res: Response;
  try {
    res = await fetch(`${apiBaseUrl}/api/shifts/read-image`, {
      method: "POST",
      headers: { Authorization: `Bearer ${params.accessToken}` },
      body,
    });
  } catch {
    throw new Error("読み取りサーバーに接続できませんでした。通信環境と設定を確認してください");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "読み取りに失敗しました");
  return data as NormalizedExtraction;
}
