import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import {
  extractedShiftsSchema,
  type NormalizedExtraction,
  normalizeExtraction,
} from "@shifton/core";

/** 読み取りに使うモデル */
const MODEL = "claude-opus-5-5";

export const SUPPORTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;
export type SupportedImageType = (typeof SUPPORTED_IMAGE_TYPES)[number];

/** Claude API に送れる画像の上限（base64 化前のバイト数で 5MB 未満に抑える） */
export const MAX_IMAGE_BYTES = 3.5 * 1024 * 1024;

export const isShiftReaderConfigured = Boolean(process.env.ANTHROPIC_API_KEY);

const SYSTEM_PROMPT = `あなたは、日本のアルバイト先から配られたシフト表を読み取るアシスタントです。
画像は、紙のシフト表の写真、シフト管理アプリやLINEのスクリーンショット、Excelの画面などです。

目的: 画像から「利用者本人」のシフトだけを抜き出すこと。

読み取りのルール:
- 利用者の名前が指定されていれば、その人の行・列だけを読む。表記ゆれ（姓のみ、名のみ、ひらがな・カタカナ、スペースの有無）は同じ人として扱う。
- 名前が指定されていない場合は、画像が本人だけのシフト（個人のシフト一覧のスクショなど）だと考えてすべて読む。複数人の表で誰のものか判断できないときは personFound を false にし、warnings で名前の入力をお願いする。
- 日付は YYYY-MM-DD。年が書かれていなければ「今日の日付」を基準に、最も自然な年を推測する（12月に1月の表を読むなら翌年）。
- 時刻は 24 時間表記の HH:mm。「9-17」は 09:00〜17:00。日をまたぐ勤務は 25:00 のように書かれていてもそのまま返してよい。
- 「早番」「A」などの記号は、画像内に凡例（時間の説明）があればその時間に置き換え、記号は note に入れる。時間が分からない記号のシフトは shifts に入れず、warnings に「12/5 の『早』は時間が分からないため読み取れませんでした」のように書く。
- 休み・公休・希望休の日は出力しない。
- 休憩時間が書かれていれば breakMinutes に分で入れ、なければ null。
- 文字がつぶれている、影で読めないなど自信がない値は confidence を low にする。推測で値を作らない。
- 画像がシフト表ではない場合は personFound を false にし、shifts を空にして warnings で伝える。
- warnings は利用者に表示するので、短い日本語で書く。`;

/**
 * シフト表の画像を読み取り、本人のシフトの候補を返す。
 * 確定はせず、利用者が確認画面で修正してから登録する前提。
 */
export async function readShiftsFromImage(params: {
  image: Uint8Array;
  mediaType: SupportedImageType;
  /** シフト表に書かれている自分の名前（任意） */
  nameOnSheet?: string;
  /** 年の推測に使う今日の日付（YYYY-MM-DD） */
  today: string;
}): Promise<NormalizedExtraction> {
  const client = new Anthropic();

  const instructions = [
    `今日の日付: ${params.today}`,
    params.nameOnSheet
      ? `利用者の名前（シフト表での表記）: ${params.nameOnSheet}`
      : "利用者の名前: 指定なし",
    "この画像から利用者のシフトを読み取ってください。",
  ].join("\n");

  const response = await client.beta.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    // 読み取りは定型的な作業なので、深く考えすぎないよう effort を明示する
    output_config: { effort: "medium", format: betaZodOutputFormat(extractedShiftsSchema) },
    // 安全上の理由で断られた場合、API 側で別モデルに切り替えて続行する
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: params.mediaType,
              data: Buffer.from(params.image).toString("base64"),
            },
          },
          { type: "text", text: instructions },
        ],
      },
    ],
  });

  if (response.stop_reason === "refusal") {
    throw new ShiftReaderError("この画像は読み取れませんでした。別の画像でお試しください");
  }
  if (response.stop_reason === "max_tokens" || !response.parsed_output) {
    throw new ShiftReaderError("読み取り結果を解釈できませんでした。画像を分けて試してください");
  }
  return normalizeExtraction(response.parsed_output);
}

/** 利用者にそのまま表示してよいエラー */
export class ShiftReaderError extends Error {}
